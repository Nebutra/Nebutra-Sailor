FROM python:3.11-slim@sha256:06fa338add3c2ab8daeff7304a6bb204c68f67743b13553a8999605fc8097c58

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8007

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8007"]
