/*
  DaVinciFlow — user_purchase_summary: top 20 buyers by spend
*/

with joined as (
    select
        p.user_id,
        u.name,
        u.email,
        pr.price::double as unit_price
    from main.purchases p
    left join main.users u  on u.id  = p.user_id
    left join main.products pr on pr.id = p.product_id
    where p.returned_at is null
),

summary as (
    select
        user_id,
        name,
        email,
        count(*)                    as total_orders,
        round(sum(unit_price), 2)   as total_spent,
        round(avg(unit_price), 2)   as avg_order_value
    from joined
    group by user_id, name, email
)

select * from summary
order by total_spent desc
limit 20
