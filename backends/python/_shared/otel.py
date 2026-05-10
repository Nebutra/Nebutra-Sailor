"""Shared OpenTelemetry instrumentation for Python microservices.

Usage in each service's main.py:
    from _shared.otel import instrument_app
    instrument_app(app, service_name="ai-service")
"""

import os


def instrument_app(app, service_name: str) -> None:
    """Instrument a FastAPI app with OpenTelemetry tracing."""
    otlp_endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT")
    if not otlp_endpoint:
        return  # Skip instrumentation if no collector configured

    # Lazy imports — opentelemetry-instrumentation uses pkg_resources which
    # requires setuptools. Importing only when OTEL is actually enabled avoids
    # the dependency in environments where instrumentation is disabled.
    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.sdk.resources import Resource, SERVICE_NAME
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    resource = Resource.create({SERVICE_NAME: service_name})
    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    FastAPIInstrumentor.instrument_app(app)
