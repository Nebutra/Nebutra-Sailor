{{
  config(
    order_by='(tenant_id, day)',
    partition_by='toYYYYMM(day)'
  )
}}

with base as (
  select *
  from {{ ref('events_silver') }}
)

select
  tenant_id,
  event_date as day,
  countIf(funnel_stage = 'signup') as signups,
  countIf(funnel_stage = 'activation') as activations,
  countIf(funnel_stage = 'conversion') as conversions,
  round(sumIf(amount_usd, amount_usd > 0), 4) as revenue,
  uniqIf(user_id, user_id is not null) as active_users,
  count() as total_events
from base
group by tenant_id, day
