from __future__ import annotations

import ast
import operator
from typing import Any

import pandas as pd


class UnsafeExpressionError(ValueError):
    pass


class _ExpressionEvaluator:
    def __init__(self, frame: pd.DataFrame) -> None:
        self.frame = frame

    def evaluate(self, expression: str) -> pd.Series:
        try:
            tree = ast.parse(expression, mode="eval")
        except SyntaxError as exc:
            raise UnsafeExpressionError("Invalid filter expression syntax") from exc

        result = self._eval_node(tree.body)
        return self._coerce_to_mask(result)

    def _eval_node(self, node: ast.AST) -> Any:
        if isinstance(node, ast.Name):
            if node.id not in self.frame.columns:
                raise UnsafeExpressionError(f"Unknown column '{node.id}'")
            return self.frame[node.id]

        if isinstance(node, ast.Constant):
            return node.value

        if isinstance(node, (ast.List, ast.Tuple, ast.Set)):
            values = [self._eval_node(element) for element in node.elts]
            if any(isinstance(value, pd.Series) for value in values):
                raise UnsafeExpressionError("Collection literals cannot contain column references")
            return values

        if isinstance(node, ast.BoolOp):
            values = [self._coerce_to_mask(self._eval_node(value)) for value in node.values]
            if isinstance(node.op, ast.And):
                return self._combine_masks(values, operator.and_)
            if isinstance(node.op, ast.Or):
                return self._combine_masks(values, operator.or_)
            raise UnsafeExpressionError("Unsupported boolean operator")

        if isinstance(node, ast.UnaryOp):
            operand = self._eval_node(node.operand)
            if isinstance(node.op, ast.Not):
                return ~self._coerce_to_mask(operand)
            if isinstance(node.op, ast.USub):
                return -operand
            if isinstance(node.op, ast.UAdd):
                return +operand
            raise UnsafeExpressionError("Unsupported unary operator")

        if isinstance(node, ast.BinOp):
            left = self._eval_node(node.left)
            right = self._eval_node(node.right)
            return self._apply_binary_operator(left, node.op, right)

        if isinstance(node, ast.Compare):
            left = self._eval_node(node.left)
            comparisons: list[pd.Series] = []
            for operator_node, comparator in zip(node.ops, node.comparators):
                right = self._eval_node(comparator)
                comparisons.append(self._apply_comparison(left, operator_node, right))
                left = right
            return self._combine_masks(comparisons, operator.and_)

        raise UnsafeExpressionError(f"Unsupported expression element: {node.__class__.__name__}")

    def _apply_binary_operator(self, left: Any, op: ast.operator, right: Any) -> Any:
        binary_operators: dict[type[ast.operator], Any] = {
            ast.Add: operator.add,
            ast.Sub: operator.sub,
            ast.Mult: operator.mul,
            ast.Div: operator.truediv,
            ast.Mod: operator.mod,
        }
        handler = binary_operators.get(type(op))
        if handler is None:
            raise UnsafeExpressionError("Unsupported arithmetic operator")
        return handler(left, right)

    def _apply_comparison(self, left: Any, op: ast.cmpop, right: Any) -> pd.Series:
        comparison_operators: dict[type[ast.cmpop], Any] = {
            ast.Eq: operator.eq,
            ast.NotEq: operator.ne,
            ast.Gt: operator.gt,
            ast.GtE: operator.ge,
            ast.Lt: operator.lt,
            ast.LtE: operator.le,
        }
        handler = comparison_operators.get(type(op))
        if handler is not None:
            return self._coerce_to_mask(handler(left, right))

        if isinstance(op, ast.In):
            if isinstance(right, pd.Series):
                raise UnsafeExpressionError("'in' collections cannot be column references")
            if isinstance(left, pd.Series):
                return self._coerce_to_mask(left.isin(right))
            return self._coerce_to_mask(left in right)

        if isinstance(op, ast.NotIn):
            if isinstance(right, pd.Series):
                raise UnsafeExpressionError("'not in' collections cannot be column references")
            if isinstance(left, pd.Series):
                return self._coerce_to_mask(~left.isin(right))
            return self._coerce_to_mask(left not in right)

        raise UnsafeExpressionError("Unsupported comparison operator")

    def _coerce_to_mask(self, value: Any) -> pd.Series:
        if isinstance(value, pd.Series):
            if not pd.api.types.is_bool_dtype(value):
                raise UnsafeExpressionError("Expression must evaluate to a boolean mask")
            return value.fillna(False).astype(bool)
        if isinstance(value, bool):
            return pd.Series([value] * len(self.frame.index), index=self.frame.index, dtype=bool)
        raise UnsafeExpressionError("Expression must evaluate to a boolean mask")

    def _combine_masks(self, masks: list[pd.Series], op: Any) -> pd.Series:
        if not masks:
            raise UnsafeExpressionError("Expression cannot be empty")
        combined = masks[0]
        for mask in masks[1:]:
            combined = op(combined, mask)
        return combined


def filter_dataframe(frame: pd.DataFrame, expression: str) -> pd.DataFrame:
    mask = _ExpressionEvaluator(frame).evaluate(expression)
    return frame.loc[mask].copy()
