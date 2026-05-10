# _shared

Shared Python utilities used across all Nebutra microservices.

## otel.py

Provides `instrument_app(app, service_name)` to add OpenTelemetry distributed
tracing to any FastAPI application. Tracing is enabled only when the
`OTEL_EXPORTER_OTLP_ENDPOINT` environment variable is set, so local
development remains unaffected.

### Usage

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from _shared.otel import instrument_app

app = FastAPI(...)
instrument_app(app, service_name="my-service")
```
