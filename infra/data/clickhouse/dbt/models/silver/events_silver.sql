{{
  config(
    order_by='(tenant_id, event_time, event_id)',
    partition_by='toYYYYMM(event_time)'
  )
}}

with base as (
  select *
  from {{ ref('events_bronze') }}
),

normalized as (
  select
    event_id,
    event_name,
    tenant_id,
    user_id,
    session_id,
    utm_source,
    utm_medium,
    utm_campaign,
    experiment_id,
    request_id,
    trace_id,
    source,
    contract_version,
    event_time,
    received_at,
    event_properties,
    JSONExtractString(event_properties, 'plan') as plan,
    JSONExtractFloat(event_properties, 'amount_usd') as amount_usd,
    toDate(event_time) as event_date,
    if(
      event_name in ('user.signed_up', 'auth.signup.completed'),
      'signup',
      if(
        event_name in ('user.activated', 'workspace.created'),
        'activation',
        if(
          event_name in ('billing.subscription_started', 'billing.invoice_paid'),
          'conversion',
          'other'
        )
      )
    ) as funnel_stage
  from base
)

select *
from normalized
