{{
  config(
    order_by='(tenant_id, event_time, event_id)',
    partition_by='toYYYYMM(event_time)'
  )
}}

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
  toDateTime64(event_time, 3, 'UTC') as event_time,
  toDateTime64(received_at, 3, 'UTC') as received_at,
  event_properties,
  if(length(event_properties) > 0, 1, 0) as has_payload
from {{ source('raw', 'events_bronze') }}
