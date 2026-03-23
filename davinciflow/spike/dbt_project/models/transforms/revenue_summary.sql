/*
  DaVinciFlow — revenue_summary: revenue per product
  purchases joins products to get price (price lives on products, not purchases)
*/

with joined as (
    select
        p.id          as purchase_id,
        p.product_id,
        p.user_id,
        pr.make,
        pr.model,
        pr.year,
        pr.price::double as unit_price
    from main.purchases p
    left join main.products pr on pr.id = p.product_id
    where p.returned_at is null   -- exclude returns
),

summary as (
    select
        product_id,
        make,
        model,
        year,
        count(*)                       as total_orders,
        round(sum(unit_price), 2)      as total_revenue,
        round(avg(unit_price), 2)      as avg_order_value
    from joined
    group by product_id, make, model, year
)

select * from summary
order by total_revenue desc
