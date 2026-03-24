FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV DAVINCIFLOW_ELT_PYTHON=/opt/davinciflow-elt/bin/python

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential librdkafka-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
COPY backend/requirements-elt.txt ./requirements-elt.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && python -m venv /opt/davinciflow-elt \
    && /opt/davinciflow-elt/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/davinciflow-elt/bin/pip install --no-cache-dir -r requirements-elt.txt

COPY backend/app ./app
COPY spike ./spike

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
