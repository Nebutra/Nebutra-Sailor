# Kubernetes Manifests

Kubernetes deployment configurations for production microservices.

## Prerequisites

- Kubernetes cluster (GKE, EKS, AKS, or local)
- `kubectl` configured
- Container registry access

## Structure

```
infra/iac/k8s/
├── base/                  # Base configurations
│   ├── namespace.yaml
│   └── configmap.yaml
├── services/              # Service deployments
│   ├── ai/
│   ├── content/
│   ├── recsys/
│   ├── ecommerce/
│   └── web3/
├── ingress/               # Ingress configurations
└── secrets/               # Secret templates (not committed)
```

## Quick Start

### 1. Create namespace

```bash
kubectl apply -f base/namespace.yaml
```

### 2. Create secrets

```bash
kubectl create secret generic app-secrets \
  --from-literal=DATABASE_URL=... \
  --from-literal=REDIS_URL=... \
  --from-literal=OPENAI_API_KEY=... \
  -n nebutra
```

### 3. Deploy services

```bash
kubectl apply -f services/ -n nebutra
```

### 4. Configure ingress

```bash
kubectl apply -f ingress/ -n nebutra
```

## Service Configuration

Each service has:

- `deployment.yaml` — Pod specification
- `service.yaml` — Internal service
- `hpa.yaml` — Horizontal Pod Autoscaler

Example deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ai-service
  template:
    spec:
      containers:
        - name: ai
          image: nebutra/ai-service:latest
          ports:
            - containerPort: 8001
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

## Scaling

### Manual scaling

```bash
kubectl scale deployment ai-service --replicas=3 -n nebutra
```

### Auto-scaling (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ai-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Monitoring

Check pod status:

```bash
kubectl get pods -n nebutra
kubectl logs -f deployment/ai-service -n nebutra
```

## Related

- [Terraform configs](../terraform/) — Infrastructure provisioning
- [Docker configs](../docker/) — Local development
