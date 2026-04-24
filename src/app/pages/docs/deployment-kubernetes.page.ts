import { Component, ChangeDetectionStrategy } from '@angular/core';
import { DocsContentTranslationDirective } from './docs-content-translation.directive';

@Component({
  selector: 'app-docs-deployment-kubernetes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocsContentTranslationDirective],
  template: `
    <div appDocsContentTranslation class="p-6 sm:p-8 lg:p-12 max-w-4xl">
      <!-- Breadcrumb -->
      <div class="mb-6">
        <a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a>
        <span class="text-secondary-400 mx-2">/</span>
        <a href="/docs/deployment" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Deployment</a>
        <span class="text-secondary-400 mx-2">/</span>
        <span class="text-secondary-600 text-sm">Kubernetes</span>
      </div>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-secondary-900 mb-4">Kubernetes Deployment</h1>
        <p class="text-lg text-secondary-600">
          Deploy Local.LLM on Kubernetes for enterprise-scale, highly available deployments with automatic scaling and orchestration.
        </p>
      </div>

      <!-- Content -->
      <div class="prose prose-lg max-w-none space-y-8">
        <!-- Prerequisites -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Prerequisites</h2>
          <ul class="space-y-2 text-secondary-700">
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span>Kubernetes cluster (v1.21+) running on any cloud provider or on-premises</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span>kubectl CLI tool configured to access your cluster</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span>Container registry access (DockerHub, ECR, GCR, etc.)</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span>Helm 3.x installed (optional, but recommended)</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span>Sufficient cluster resources: 4+ CPU cores, 8GB+ RAM minimum</span>
            </li>
          </ul>
        </section>

        <!-- Deployment Manifest -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Basic Kubernetes Deployment</h2>
          <p class="text-secondary-700 mb-4">
            Create a <code class="bg-secondary-100 px-2 py-1 rounded">local-llm-deployment.yaml</code> file:
          </p>

          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">apiVersion: v1
kind: Namespace
metadata:
  name: local-llm

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-llm-config
  namespace: local-llm
data:
  NODE_ENV: "production"
  DEPLOYMENT_MODE: "self-hosted"
  ENABLE_GPU: "false"

---
apiVersion: v1
kind: Secret
metadata:
  name: local-llm-secrets
  namespace: local-llm
type: Opaque
stringData:
  JWT_SECRET: "your-secret-key"
  API_KEY: "your-api-key"
  DB_URL: "postgresql://user:password@postgres:5432/local_llm"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: local-llm
  namespace: local-llm
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: local-llm
  template:
    metadata:
      labels:
        app: local-llm
    spec:
      containers:
      - name: local-llm
        image: locallm/local-llm:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        envFrom:
        - configMapRef:
            name: local-llm-config
        - secretRef:
            name: local-llm-secrets
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        volumeMounts:
        - name: data
          mountPath: /app/data
        - name: models
          mountPath: /app/models
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: local-llm-data-pvc
      - name: models
        persistentVolumeClaim:
          claimName: local-llm-models-pvc

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: local-llm-data-pvc
  namespace: local-llm
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: local-llm-models-pvc
  namespace: local-llm
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi

---
apiVersion: v1
kind: Service
metadata:
  name: local-llm
  namespace: local-llm
spec:
  selector:
    app: local-llm
  ports:
  - port: 80
    targetPort: 3000
    name: http
  type: ClusterIP

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: local-llm-hpa
  namespace: local-llm
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: local-llm
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80</pre>
          </div>

          <p class="text-secondary-700">
            Deploy this configuration:
          </p>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mt-2">
            <pre class="text-white text-sm font-mono">kubectl apply -f local-llm-deployment.yaml</pre>
          </div>
        </section>

        <!-- Ingress Configuration -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Ingress Configuration</h2>
          <p class="text-secondary-700 mb-4">
            Expose Local.LLM externally using Kubernetes Ingress:
          </p>

          <div class="bg-black rounded-lg p-4 overflow-x-auto mb-4">
            <pre class="text-white text-sm font-mono">apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: local-llm-ingress
  namespace: local-llm
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - llm.example.com
    secretName: local-llm-tls
  rules:
  - host: llm.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: local-llm
            port:
              number: 80</pre>
          </div>

          <p class="text-secondary-700">
            Replace <code class="bg-secondary-100 px-2 py-1 rounded">llm.example.com</code> with your domain and ensure your DNS records point to the Ingress controller.
          </p>
        </section>

        <!-- Storage Considerations -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Storage Considerations</h2>
          <p class="text-secondary-700 mb-4">
            For production Kubernetes deployments, consider using managed storage solutions:
          </p>

          <ul class="space-y-2 text-secondary-700">
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span><strong>AWS EBS:</strong> Use AWS Elastic Block Store for persistent volumes</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span><strong>GCP Persistent Disk:</strong> Google Cloud's persistent storage solution</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span><strong>Azure Disk:</strong> Microsoft Azure's persistent storage</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span><strong>NFS:</strong> Network File System for shared storage across nodes</span>
            </li>
          </ul>

          <p class="text-secondary-700 mt-4">
            For model caching, use <code class="bg-secondary-100 px-2 py-1 rounded">ReadWriteMany</code> access mode to share models across replicas.
          </p>
        </section>

        <!-- Monitoring and Logging -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Monitoring and Logging</h2>
          <p class="text-secondary-700 mb-4">
            Monitor your Kubernetes deployment using standard tools:
          </p>

          <ul class="space-y-2 text-secondary-700">
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span><strong>Prometheus:</strong> Metrics collection and monitoring</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span><strong>Grafana:</strong> Visualization and dashboards</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span><strong>ELK Stack:</strong> Elasticsearch, Logstash, Kibana for log aggregation</span>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 font-bold">•</span>
              <span><strong>Datadog/New Relic:</strong> Third-party monitoring services</span>
            </li>
          </ul>

          <p class="text-secondary-700 mt-4">
            Check pod logs with:
          </p>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mt-2">
            <pre class="text-white text-sm font-mono">kubectl logs -n local-llm -l app=local-llm --tail=100 -f</pre>
          </div>
        </section>

        <!-- Database Setup -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">PostgreSQL Database Setup</h2>
          <p class="text-secondary-700 mb-4">
            Deploy PostgreSQL in Kubernetes using a StatefulSet or use a managed service:
          </p>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p class="text-sm text-blue-900">
              <strong>Best Practice:</strong> For production, use managed PostgreSQL services (AWS RDS, Google Cloud SQL, Azure Database) instead of self-hosted to ensure reliability and backups.
            </p>
          </div>

          <p class="text-secondary-700">
            If self-hosting, use the Bitnami PostgreSQL Helm chart:
          </p>
          <div class="bg-black rounded-lg p-4 overflow-x-auto mt-2">
            <pre class="text-white text-sm font-mono">helm repo add bitnami https://charts.bitnami.com/bitnami
helm install postgres bitnami/postgresql \
  --namespace local-llm \
  --set auth.username=llm_user \
  --set auth.password=secure-password \
  --set auth.database=local_llm</pre>
          </div>
        </section>

        <!-- Troubleshooting -->
        <section>
          <h2 class="text-2xl font-bold text-secondary-900 mb-4">Troubleshooting</h2>

          <div class="space-y-4">
            <div class="border-l-4 border-orange-400 bg-orange-50 p-4 rounded">
              <h4 class="font-semibold text-secondary-900 mb-2">Pod Not Starting</h4>
              <p class="text-secondary-700 text-sm">
                Check pod status: <code class="bg-white px-1">kubectl describe pod -n local-llm &lt;pod-name&gt;</code>
              </p>
            </div>

            <div class="border-l-4 border-orange-400 bg-orange-50 p-4 rounded">
              <h4 class="font-semibold text-secondary-900 mb-2">Persistent Volume Claim Pending</h4>
              <p class="text-secondary-700 text-sm">
                Verify storage class: <code class="bg-white px-1">kubectl get storageclass</code>. Ensure your cluster has a default storage class.
              </p>
            </div>

            <div class="border-l-4 border-orange-400 bg-orange-50 p-4 rounded">
              <h4 class="font-semibold text-secondary-900 mb-2">High Memory Usage</h4>
              <p class="text-secondary-700 text-sm">
                Adjust memory requests/limits in the deployment spec and tune model cache size via environment variables.
              </p>
            </div>

            <div class="border-l-4 border-orange-400 bg-orange-50 p-4 rounded">
              <h4 class="font-semibold text-secondary-900 mb-2">Service Not Accessible</h4>
              <p class="text-secondary-700 text-sm">
                Verify ingress configuration and DNS resolution. Check ingress status: <code class="bg-white px-1">kubectl get ingress -n local-llm</code>
              </p>
            </div>
          </div>
        </section>

        <!-- Next Steps -->
        <section class="bg-primary-50 rounded-lg p-6 border border-primary-200">
          <h3 class="font-semibold text-secondary-900 mb-3">Next Steps</h3>
          <ul class="space-y-2 text-secondary-700">
            <li>
              <a href="/docs/configuration" class="text-primary-600 hover:text-primary-700 font-medium">Configuration Guide</a> - Learn about all available environment variables
            </li>
            <li>
              <a href="/docs/troubleshooting" class="text-primary-600 hover:text-primary-700 font-medium">Troubleshooting</a> - Common issues and solutions
            </li>
            <li>
              <a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 font-medium">API Reference</a> - Explore the Local.LLM API
            </li>
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class DocsDeploymentKubernetesPageComponent {}
