export const supportedDocLanguages = ['en', 'ko', 'ja', 'ru'] as const;

export type SupportedDocLanguage = (typeof supportedDocLanguages)[number];
export type DocsPageId =
  | 'getting-started'
  | 'installation'
  | 'deployment'
  | 'deployment-docker'
  | 'deployment-kubernetes'
  | 'configuration'
  | 'troubleshooting'
  | 'api-auth'
  | 'api-applications'
  | 'api-models';

type DocsPageTranslations = Record<SupportedDocLanguage, string>;

const raw = String.raw;

const docsPageHtml: Record<DocsPageId, DocsPageTranslations> = {
  'getting-started': {
    en: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl">
  <div class="mb-6">
    <a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a>
    <span class="text-secondary-400 mx-2">/</span>
    <span class="text-secondary-600 text-sm">Getting Started</span>
  </div>
  <div class="mb-8">
    <h1 class="text-4xl font-bold text-secondary-900 mb-4">Getting Started</h1>
    <p class="text-lg text-secondary-600">Learn how to get up and running with Local.LLM in minutes.</p>
  </div>
  <div class="prose prose-lg max-w-none space-y-8">
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">What is Local.LLM?</h2>
      <p class="text-secondary-700 leading-relaxed">Local.LLM is a unified platform for running and managing AI applications. You can use our managed cloud service or deploy the same experience on your own infrastructure.</p>
    </section>
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">Highlights</h2>
      <ul class="space-y-3 text-secondary-700">
        <li class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">•</span><span><strong>Cloud or self-hosted:</strong> choose the deployment model that matches your team.</span></li>
        <li class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">•</span><span><strong>Production ready:</strong> security, scalability, and observability are built in.</span></li>
        <li class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">•</span><span><strong>Multiple AI apps:</strong> launch chat, coding, and content workflows from one dashboard.</span></li>
      </ul>
    </section>
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">Quick Start</h2>
      <div class="space-y-4">
        <div class="border-l-4 border-primary-600 pl-4">
          <h3 class="font-semibold text-secondary-900 mb-2">1. Create an account</h3>
          <p class="text-secondary-700 text-sm">Sign up on the Local.LLM cloud to explore the platform immediately.</p>
        </div>
        <div class="border-l-4 border-primary-600 pl-4">
          <h3 class="font-semibold text-secondary-900 mb-2">2. Choose a deployment</h3>
          <p class="text-secondary-700 text-sm">Pick the hosted cloud experience or follow the self-hosted guides for your own environment.</p>
        </div>
        <div class="border-l-4 border-primary-600 pl-4">
          <h3 class="font-semibold text-secondary-900 mb-2">3. Launch your first app</h3>
          <p class="text-secondary-700 text-sm">Open the dashboard, select an application, and start working with AI right away.</p>
        </div>
      </div>
    </section>
    <section class="bg-secondary-50 rounded-lg p-6">
      <h3 class="font-semibold text-secondary-900 mb-3">Next Steps</h3>
      <ul class="space-y-2 text-secondary-700 text-sm">
        <li><a href="/docs/installation" class="text-primary-600 hover:text-primary-700 font-medium">→ Installation Guide</a></li>
        <li><a href="/docs/deployment" class="text-primary-600 hover:text-primary-700 font-medium">→ Deployment Options</a></li>
        <li><a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 font-medium">→ API Reference</a></li>
      </ul>
    </section>
  </div>
</div>`,
    ko: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl">
  <div class="mb-6">
    <a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">문서</a>
    <span class="text-secondary-400 mx-2">/</span>
    <span class="text-secondary-600 text-sm">시작하기</span>
  </div>
  <div class="mb-8">
    <h1 class="text-4xl font-bold text-secondary-900 mb-4">시작하기</h1>
    <p class="text-lg text-secondary-600">몇 분 안에 Local.LLM을 시작하는 방법을 알아보세요.</p>
  </div>
  <div class="prose prose-lg max-w-none space-y-8">
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">Local.LLM이란?</h2>
      <p class="text-secondary-700 leading-relaxed">Local.LLM은 AI 애플리케이션을 실행하고 관리하기 위한 통합 플랫폼입니다. 관리형 클라우드를 사용할 수도 있고, 동일한 경험을 자체 인프라에 배포할 수도 있습니다.</p>
    </section>
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">주요 특징</h2>
      <ul class="space-y-3 text-secondary-700">
        <li class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">•</span><span><strong>클라우드 또는 자체 호스팅:</strong> 팀에 맞는 배포 방식을 선택할 수 있습니다.</span></li>
        <li class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">•</span><span><strong>프로덕션 준비 완료:</strong> 보안, 확장성, 관측성이 기본으로 제공됩니다.</span></li>
        <li class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">•</span><span><strong>여러 AI 앱:</strong> 하나의 대시보드에서 채팅, 코딩, 콘텐츠 워크플로를 시작하세요.</span></li>
      </ul>
    </section>
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">빠른 시작</h2>
      <div class="space-y-4">
        <div class="border-l-4 border-primary-600 pl-4">
          <h3 class="font-semibold text-secondary-900 mb-2">1. 계정 만들기</h3>
          <p class="text-secondary-700 text-sm">Local.LLM 클라우드에 가입해 플랫폼을 바로 둘러보세요.</p>
        </div>
        <div class="border-l-4 border-primary-600 pl-4">
          <h3 class="font-semibold text-secondary-900 mb-2">2. 배포 방식 선택</h3>
          <p class="text-secondary-700 text-sm">관리형 클라우드를 선택하거나 자체 환경을 위한 가이드를 따라 배포할 수 있습니다.</p>
        </div>
        <div class="border-l-4 border-primary-600 pl-4">
          <h3 class="font-semibold text-secondary-900 mb-2">3. 첫 앱 실행</h3>
          <p class="text-secondary-700 text-sm">대시보드를 열고 애플리케이션을 선택해 바로 AI를 사용해 보세요.</p>
        </div>
      </div>
    </section>
    <section class="bg-secondary-50 rounded-lg p-6">
      <h3 class="font-semibold text-secondary-900 mb-3">다음 단계</h3>
      <ul class="space-y-2 text-secondary-700 text-sm">
        <li><a href="/docs/installation" class="text-primary-600 hover:text-primary-700 font-medium">→ 설치 가이드</a></li>
        <li><a href="/docs/deployment" class="text-primary-600 hover:text-primary-700 font-medium">→ 배포 옵션</a></li>
        <li><a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 font-medium">→ API 레퍼런스</a></li>
      </ul>
    </section>
  </div>
</div>`,
    ja: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl">
  <div class="mb-6">
    <a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">ドキュメント</a>
    <span class="text-secondary-400 mx-2">/</span>
    <span class="text-secondary-600 text-sm">はじめに</span>
  </div>
  <div class="mb-8">
    <h1 class="text-4xl font-bold text-secondary-900 mb-4">はじめに</h1>
    <p class="text-lg text-secondary-600">Local.LLM を数分で使い始めるための概要です。</p>
  </div>
  <div class="prose prose-lg max-w-none space-y-8">
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">Local.LLM とは？</h2>
      <p class="text-secondary-700 leading-relaxed">Local.LLM は AI アプリケーションを実行・管理するための統合プラットフォームです。マネージドクラウドを利用することも、同じ体験を自社インフラに展開することもできます。</p>
    </section>
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">主な特長</h2>
      <ul class="space-y-3 text-secondary-700">
        <li class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">•</span><span><strong>クラウド / セルフホスト:</strong> チームに合った導入方法を選べます。</span></li>
        <li class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">•</span><span><strong>本番運用対応:</strong> セキュリティ、拡張性、可観測性を最初から備えています。</span></li>
        <li class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">•</span><span><strong>複数の AI アプリ:</strong> チャット、コーディング、コンテンツ生成を 1 つのダッシュボードから起動できます。</span></li>
      </ul>
    </section>
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">クイックスタート</h2>
      <div class="space-y-4">
        <div class="border-l-4 border-primary-600 pl-4">
          <h3 class="font-semibold text-secondary-900 mb-2">1. アカウントを作成</h3>
          <p class="text-secondary-700 text-sm">Local.LLM クラウドに登録して、すぐにプラットフォームを試しましょう。</p>
        </div>
        <div class="border-l-4 border-primary-600 pl-4">
          <h3 class="font-semibold text-secondary-900 mb-2">2. 導入方法を選ぶ</h3>
          <p class="text-secondary-700 text-sm">ホスト型のクラウド体験を使うか、自社環境向けのガイドに従ってセルフホストします。</p>
        </div>
        <div class="border-l-4 border-primary-600 pl-4">
          <h3 class="font-semibold text-secondary-900 mb-2">3. 最初のアプリを起動</h3>
          <p class="text-secondary-700 text-sm">ダッシュボードを開き、アプリを選んですぐに AI を使い始めます。</p>
        </div>
      </div>
    </section>
    <section class="bg-secondary-50 rounded-lg p-6">
      <h3 class="font-semibold text-secondary-900 mb-3">次のステップ</h3>
      <ul class="space-y-2 text-secondary-700 text-sm">
        <li><a href="/docs/installation" class="text-primary-600 hover:text-primary-700 font-medium">→ インストールガイド</a></li>
        <li><a href="/docs/deployment" class="text-primary-600 hover:text-primary-700 font-medium">→ デプロイ方法</a></li>
        <li><a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 font-medium">→ API リファレンス</a></li>
      </ul>
    </section>
  </div>
</div>`,
    ru: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl">
  <div class="mb-6">
    <a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Документация</a>
    <span class="text-secondary-400 mx-2">/</span>
    <span class="text-secondary-600 text-sm">Начало работы</span>
  </div>
  <div class="mb-8">
    <h1 class="text-4xl font-bold text-secondary-900 mb-4">Начало работы</h1>
    <p class="text-lg text-secondary-600">Узнайте, как начать работу с Local.LLM за считанные минуты.</p>
  </div>
  <div class="prose prose-lg max-w-none space-y-8">
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">Что такое Local.LLM?</h2>
      <p class="text-secondary-700 leading-relaxed">Local.LLM — это единая платформа для запуска и управления ИИ-приложениями. Вы можете использовать наш облачный сервис или развернуть ту же среду на собственной инфраструктуре.</p>
    </section>
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">Ключевые возможности</h2>
      <ul class="space-y-3 text-secondary-700">
        <li class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">•</span><span><strong>Облако или свой хостинг:</strong> выберите модель развёртывания, подходящую вашей команде.</span></li>
        <li class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">•</span><span><strong>Готово к продакшену:</strong> безопасность, масштабирование и наблюдаемость доступны сразу.</span></li>
        <li class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">•</span><span><strong>Несколько ИИ-приложений:</strong> запускайте чат, кодовые инструменты и генерацию контента из одной панели.</span></li>
      </ul>
    </section>
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">Быстрый старт</h2>
      <div class="space-y-4">
        <div class="border-l-4 border-primary-600 pl-4">
          <h3 class="font-semibold text-secondary-900 mb-2">1. Создайте аккаунт</h3>
          <p class="text-secondary-700 text-sm">Зарегистрируйтесь в облаке Local.LLM и сразу изучите платформу.</p>
        </div>
        <div class="border-l-4 border-primary-600 pl-4">
          <h3 class="font-semibold text-secondary-900 mb-2">2. Выберите способ развёртывания</h3>
          <p class="text-secondary-700 text-sm">Используйте управляемое облако или следуйте руководствам по самостоятельному размещению.</p>
        </div>
        <div class="border-l-4 border-primary-600 pl-4">
          <h3 class="font-semibold text-secondary-900 mb-2">3. Запустите первое приложение</h3>
          <p class="text-secondary-700 text-sm">Откройте панель, выберите приложение и начните работать с ИИ.</p>
        </div>
      </div>
    </section>
    <section class="bg-secondary-50 rounded-lg p-6">
      <h3 class="font-semibold text-secondary-900 mb-3">Что дальше</h3>
      <ul class="space-y-2 text-secondary-700 text-sm">
        <li><a href="/docs/installation" class="text-primary-600 hover:text-primary-700 font-medium">→ Руководство по установке</a></li>
        <li><a href="/docs/deployment" class="text-primary-600 hover:text-primary-700 font-medium">→ Варианты развёртывания</a></li>
        <li><a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 font-medium">→ Справочник API</a></li>
      </ul>
    </section>
  </div>
</div>`,
  },
  installation: {
    en: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl">
  <div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Installation</span></div>
  <div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Installation</h1><p class="text-lg text-secondary-600">Choose the Local.LLM installation path that fits your team.</p></div>
  <div class="prose prose-lg max-w-none space-y-8">
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">Cloud Hosted</h2>
      <p class="text-secondary-700 leading-relaxed">The fastest option is our managed cloud service. Create an account, sign in, and start launching applications without maintaining infrastructure.</p>
      <div class="mt-4 space-y-3">
        <div class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">1.</span><span class="text-secondary-700">Create an account and verify your email.</span></div>
        <div class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">2.</span><span class="text-secondary-700">Open the dashboard and review the available applications.</span></div>
        <div class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">3.</span><span class="text-secondary-700">Launch an app and configure models or permissions as needed.</span></div>
      </div>
      <div class="mt-4 bg-blue-50 border-l-4 border-blue-600 p-4 rounded"><p class="text-sm text-blue-900"><strong>Tip:</strong> Start in the cloud if you want to evaluate Local.LLM before running your own infrastructure.</p></div>
    </section>
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">Self-Hosted</h2>
      <p class="text-secondary-700 leading-relaxed">If you need full control over networking, data, or deployment policies, run Local.LLM on your own systems.</p>
      <h3 class="text-xl font-semibold text-secondary-900 mt-6 mb-3">Requirements</h3>
      <ul class="space-y-2 text-secondary-700">
        <li class="flex gap-2"><span class="text-primary-600">•</span><span>Docker and Docker Compose for the quickest setup.</span></li>
        <li class="flex gap-2"><span class="text-primary-600">•</span><span>At least 2 CPU cores, 4GB RAM, and 10GB of available storage.</span></li>
        <li class="flex gap-2"><span class="text-primary-600">•</span><span>Linux, macOS, or Windows with a compatible container runtime.</span></li>
        <li class="flex gap-2"><span class="text-primary-600">•</span><span>Open ports for the web UI, API, and any optional integrations.</span></li>
      </ul>
      <p class="text-secondary-700 text-sm mt-4">Continue with the <a href="/docs/deployment-docker" class="text-primary-600 hover:text-primary-700 font-medium">Docker deployment guide</a> or the <a href="/docs/deployment-kubernetes" class="text-primary-600 hover:text-primary-700 font-medium">Kubernetes guide</a>.</p>
    </section>
    <section class="bg-secondary-50 rounded-lg p-6">
      <h3 class="font-semibold text-secondary-900 mb-4">Recommended System Profiles</h3>
      <div class="space-y-4 text-secondary-700 text-sm">
        <div><p class="font-medium text-secondary-900 mb-1">Evaluation</p><p>2 CPU cores, 4GB RAM, 10GB storage.</p></div>
        <div><p class="font-medium text-secondary-900 mb-1">Production</p><p>4+ CPU cores, 8GB+ RAM, 50GB+ storage, external database, and monitoring.</p></div>
        <div><p class="font-medium text-secondary-900 mb-1">GPU acceleration</p><p>Use NVIDIA-compatible hardware when you need faster inference for larger workloads.</p></div>
      </div>
    </section>
  </div>
</div>`,
    ko: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl">
  <div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">문서</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">설치</span></div>
  <div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">설치</h1><p class="text-lg text-secondary-600">팀에 맞는 Local.LLM 설치 방식을 선택하세요.</p></div>
  <div class="prose prose-lg max-w-none space-y-8">
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">클라우드 호스팅</h2>
      <p class="text-secondary-700 leading-relaxed">가장 빠른 방법은 관리형 클라우드 서비스를 사용하는 것입니다. 인프라를 직접 운영하지 않고도 계정을 만들고 바로 애플리케이션을 시작할 수 있습니다.</p>
      <div class="mt-4 space-y-3">
        <div class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">1.</span><span class="text-secondary-700">계정을 만들고 이메일 인증을 완료합니다.</span></div>
        <div class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">2.</span><span class="text-secondary-700">대시보드에서 사용 가능한 애플리케이션을 확인합니다.</span></div>
        <div class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">3.</span><span class="text-secondary-700">앱을 실행하고 모델 또는 권한을 설정합니다.</span></div>
      </div>
      <div class="mt-4 bg-blue-50 border-l-4 border-blue-600 p-4 rounded"><p class="text-sm text-blue-900"><strong>팁:</strong> 자체 인프라를 운영하기 전에 Local.LLM을 평가하려면 클라우드부터 시작하세요.</p></div>
    </section>
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">자체 호스팅</h2>
      <p class="text-secondary-700 leading-relaxed">네트워크, 데이터, 배포 정책을 완전히 제어해야 한다면 자체 시스템에서 Local.LLM을 실행하세요.</p>
      <h3 class="text-xl font-semibold text-secondary-900 mt-6 mb-3">요구 사항</h3>
      <ul class="space-y-2 text-secondary-700">
        <li class="flex gap-2"><span class="text-primary-600">•</span><span>가장 빠른 설정을 위한 Docker 및 Docker Compose.</span></li>
        <li class="flex gap-2"><span class="text-primary-600">•</span><span>최소 2 CPU 코어, 4GB RAM, 10GB 저장 공간.</span></li>
        <li class="flex gap-2"><span class="text-primary-600">•</span><span>호환되는 컨테이너 런타임이 있는 Linux, macOS 또는 Windows.</span></li>
        <li class="flex gap-2"><span class="text-primary-600">•</span><span>웹 UI, API 및 선택적 통합을 위한 포트 개방.</span></li>
      </ul>
      <p class="text-secondary-700 text-sm mt-4"><a href="/docs/deployment-docker" class="text-primary-600 hover:text-primary-700 font-medium">Docker 배포 가이드</a> 또는 <a href="/docs/deployment-kubernetes" class="text-primary-600 hover:text-primary-700 font-medium">Kubernetes 가이드</a>를 계속 진행하세요.</p>
    </section>
    <section class="bg-secondary-50 rounded-lg p-6">
      <h3 class="font-semibold text-secondary-900 mb-4">권장 시스템 구성</h3>
      <div class="space-y-4 text-secondary-700 text-sm">
        <div><p class="font-medium text-secondary-900 mb-1">평가용</p><p>2 CPU 코어, 4GB RAM, 10GB 저장 공간.</p></div>
        <div><p class="font-medium text-secondary-900 mb-1">프로덕션</p><p>4개 이상의 CPU 코어, 8GB 이상의 RAM, 50GB 이상의 저장 공간, 외부 데이터베이스 및 모니터링.</p></div>
        <div><p class="font-medium text-secondary-900 mb-1">GPU 가속</p><p>대규모 워크로드에서 더 빠른 추론이 필요하면 NVIDIA 호환 하드웨어를 사용하세요.</p></div>
      </div>
    </section>
  </div>
</div>`,
    ja: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl">
  <div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">ドキュメント</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">インストール</span></div>
  <div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">インストール</h1><p class="text-lg text-secondary-600">チームに合った Local.LLM の導入方法を選択します。</p></div>
  <div class="prose prose-lg max-w-none space-y-8">
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">クラウドホスト</h2>
      <p class="text-secondary-700 leading-relaxed">最も手早い方法は、マネージドクラウドサービスを利用することです。インフラを管理せずに、アカウントを作成してすぐにアプリを起動できます。</p>
      <div class="mt-4 space-y-3">
        <div class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">1.</span><span class="text-secondary-700">アカウントを作成してメール認証を完了します。</span></div>
        <div class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">2.</span><span class="text-secondary-700">ダッシュボードで利用可能なアプリを確認します。</span></div>
        <div class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">3.</span><span class="text-secondary-700">アプリを起動し、必要に応じてモデルや権限を設定します。</span></div>
      </div>
      <div class="mt-4 bg-blue-50 border-l-4 border-blue-600 p-4 rounded"><p class="text-sm text-blue-900"><strong>ヒント:</strong> 自社運用の前に Local.LLM を評価したい場合は、まずクラウドから始めるとスムーズです。</p></div>
    </section>
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">セルフホスト</h2>
      <p class="text-secondary-700 leading-relaxed">ネットワーク、データ、デプロイ方針を完全に管理したい場合は、自社システム上で Local.LLM を実行してください。</p>
      <h3 class="text-xl font-semibold text-secondary-900 mt-6 mb-3">要件</h3>
      <ul class="space-y-2 text-secondary-700">
        <li class="flex gap-2"><span class="text-primary-600">•</span><span>最短でセットアップするための Docker と Docker Compose。</span></li>
        <li class="flex gap-2"><span class="text-primary-600">•</span><span>最低 2 CPU コア、4GB RAM、10GB の空きストレージ。</span></li>
        <li class="flex gap-2"><span class="text-primary-600">•</span><span>互換性のあるコンテナランタイムを備えた Linux、macOS、または Windows。</span></li>
        <li class="flex gap-2"><span class="text-primary-600">•</span><span>Web UI、API、任意の統合のためのポート開放。</span></li>
      </ul>
      <p class="text-secondary-700 text-sm mt-4"><a href="/docs/deployment-docker" class="text-primary-600 hover:text-primary-700 font-medium">Docker デプロイガイド</a>または<a href="/docs/deployment-kubernetes" class="text-primary-600 hover:text-primary-700 font-medium"> Kubernetes ガイド</a>へ進んでください。</p>
    </section>
    <section class="bg-secondary-50 rounded-lg p-6">
      <h3 class="font-semibold text-secondary-900 mb-4">推奨システム構成</h3>
      <div class="space-y-4 text-secondary-700 text-sm">
        <div><p class="font-medium text-secondary-900 mb-1">評価用途</p><p>2 CPU コア、4GB RAM、10GB ストレージ。</p></div>
        <div><p class="font-medium text-secondary-900 mb-1">本番用途</p><p>4 以上の CPU コア、8GB 以上の RAM、50GB 以上のストレージ、外部データベース、監視基盤。</p></div>
        <div><p class="font-medium text-secondary-900 mb-1">GPU 高速化</p><p>大規模ワークロードで高速推論が必要な場合は NVIDIA 対応ハードウェアを利用します。</p></div>
      </div>
    </section>
  </div>
</div>`,
    ru: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl">
  <div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Документация</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Установка</span></div>
  <div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Установка</h1><p class="text-lg text-secondary-600">Выберите способ установки Local.LLM, который подходит вашей команде.</p></div>
  <div class="prose prose-lg max-w-none space-y-8">
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">Облачная версия</h2>
      <p class="text-secondary-700 leading-relaxed">Самый быстрый путь — использовать наш управляемый облачный сервис. Создайте аккаунт, войдите в систему и запускайте приложения без поддержки инфраструктуры.</p>
      <div class="mt-4 space-y-3">
        <div class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">1.</span><span class="text-secondary-700">Создайте аккаунт и подтвердите адрес электронной почты.</span></div>
        <div class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">2.</span><span class="text-secondary-700">Откройте панель и изучите доступные приложения.</span></div>
        <div class="flex gap-3"><span class="text-primary-600 font-bold flex-shrink-0">3.</span><span class="text-secondary-700">Запустите приложение и настройте модели или права доступа.</span></div>
      </div>
      <div class="mt-4 bg-blue-50 border-l-4 border-blue-600 p-4 rounded"><p class="text-sm text-blue-900"><strong>Совет:</strong> начните с облака, если хотите оценить Local.LLM до запуска собственной инфраструктуры.</p></div>
    </section>
    <section>
      <h2 class="text-2xl font-bold text-secondary-900 mb-4">Собственный хостинг</h2>
      <p class="text-secondary-700 leading-relaxed">Если вам нужен полный контроль над сетью, данными и политиками развёртывания, запускайте Local.LLM на своих системах.</p>
      <h3 class="text-xl font-semibold text-secondary-900 mt-6 mb-3">Требования</h3>
      <ul class="space-y-2 text-secondary-700">
        <li class="flex gap-2"><span class="text-primary-600">•</span><span>Docker и Docker Compose для самого быстрого старта.</span></li>
        <li class="flex gap-2"><span class="text-primary-600">•</span><span>Минимум 2 ядра CPU, 4GB RAM и 10GB свободного места.</span></li>
        <li class="flex gap-2"><span class="text-primary-600">•</span><span>Linux, macOS или Windows с совместимым контейнерным рантаймом.</span></li>
        <li class="flex gap-2"><span class="text-primary-600">•</span><span>Открытые порты для web UI, API и дополнительных интеграций.</span></li>
      </ul>
      <p class="text-secondary-700 text-sm mt-4">Продолжайте с <a href="/docs/deployment-docker" class="text-primary-600 hover:text-primary-700 font-medium">руководством по Docker</a> или <a href="/docs/deployment-kubernetes" class="text-primary-600 hover:text-primary-700 font-medium">руководством по Kubernetes</a>.</p>
    </section>
    <section class="bg-secondary-50 rounded-lg p-6">
      <h3 class="font-semibold text-secondary-900 mb-4">Рекомендуемые профили системы</h3>
      <div class="space-y-4 text-secondary-700 text-sm">
        <div><p class="font-medium text-secondary-900 mb-1">Оценка</p><p>2 ядра CPU, 4GB RAM, 10GB хранилища.</p></div>
        <div><p class="font-medium text-secondary-900 mb-1">Продакшен</p><p>4+ ядра CPU, 8GB+ RAM, 50GB+ хранилища, внешняя БД и мониторинг.</p></div>
        <div><p class="font-medium text-secondary-900 mb-1">GPU-ускорение</p><p>Используйте совместимое оборудование NVIDIA, если нужна более быстрая инференция для больших нагрузок.</p></div>
      </div>
    </section>
  </div>
</div>`,
  },
  deployment: {
    en: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Deployment</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Deployment</h1><p class="text-lg text-secondary-600">Deploy Local.LLM on infrastructure that matches your scale and compliance needs.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Deployment Options</h2><div class="space-y-6"><div class="border border-secondary-200 rounded-lg p-6"><h3 class="font-semibold text-secondary-900 mb-2">Docker</h3><p class="text-secondary-700 text-sm mb-3">Use Docker for a fast, repeatable deployment on a single host or a small cluster.</p><a href="/docs/deployment-docker" class="text-primary-600 hover:text-primary-700 text-sm font-medium">View Docker deployment guide →</a></div><div class="border border-secondary-200 rounded-lg p-6"><h3 class="font-semibold text-secondary-900 mb-2">Kubernetes</h3><p class="text-secondary-700 text-sm mb-3">Choose Kubernetes when you need automation, horizontal scaling, and high availability.</p><a href="/docs/deployment-kubernetes" class="text-primary-600 hover:text-primary-700 text-sm font-medium">View Kubernetes deployment guide →</a></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Environment Configuration</h2><p class="text-secondary-700 mb-4">Local.LLM is configured through environment variables. A typical production baseline looks like this:</p><div class="bg-black rounded-lg p-4 overflow-x-auto"><pre class="text-white text-sm font-mono"><code># Server
PORT=3000
NODE_ENV=production

# Database
DB_URL=postgresql://user:pass@localhost:5432/local_llm

# Authentication
JWT_SECRET=your-secret-key
API_KEY=your-api-key

# AI Models
MODEL_CACHE_SIZE=10gb
MAX_CONCURRENT_REQUESTS=5

# Deployment
DEPLOYMENT_MODE=self-hosted
ENABLE_GPU=false</code></pre></div><p class="text-secondary-700 text-sm mt-3">See the <a href="/docs/configuration" class="text-primary-600 hover:text-primary-700">configuration reference</a> for every supported option.</p></section><section class="bg-secondary-50 rounded-lg p-6"><h3 class="font-semibold text-secondary-900 mb-4">Pre-deployment checklist</h3><ul class="space-y-2 text-secondary-700 text-sm"><li>Configure secrets and environment variables.</li><li>Prepare persistent storage and database backups.</li><li>Enable TLS, monitoring, and centralized logging.</li><li>Validate authentication, networking, and scaling policies.</li></ul></section></div></div>`,
    ko: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">문서</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">배포</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">배포</h1><p class="text-lg text-secondary-600">규모와 규정 요구 사항에 맞는 인프라에 Local.LLM을 배포하세요.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">배포 옵션</h2><div class="space-y-6"><div class="border border-secondary-200 rounded-lg p-6"><h3 class="font-semibold text-secondary-900 mb-2">Docker</h3><p class="text-secondary-700 text-sm mb-3">단일 호스트 또는 소규모 클러스터에서 빠르고 반복 가능한 배포에 적합합니다.</p><a href="/docs/deployment-docker" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Docker 배포 가이드 보기 →</a></div><div class="border border-secondary-200 rounded-lg p-6"><h3 class="font-semibold text-secondary-900 mb-2">Kubernetes</h3><p class="text-secondary-700 text-sm mb-3">자동화, 수평 확장, 고가용성이 필요하다면 Kubernetes를 선택하세요.</p><a href="/docs/deployment-kubernetes" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Kubernetes 배포 가이드 보기 →</a></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">환경 구성</h2><p class="text-secondary-700 mb-4">Local.LLM은 환경 변수로 구성됩니다. 일반적인 프로덕션 기본 설정은 다음과 같습니다.</p><div class="bg-black rounded-lg p-4 overflow-x-auto"><pre class="text-white text-sm font-mono"><code># Server
PORT=3000
NODE_ENV=production

# Database
DB_URL=postgresql://user:pass@localhost:5432/local_llm

# Authentication
JWT_SECRET=your-secret-key
API_KEY=your-api-key

# AI Models
MODEL_CACHE_SIZE=10gb
MAX_CONCURRENT_REQUESTS=5

# Deployment
DEPLOYMENT_MODE=self-hosted
ENABLE_GPU=false</code></pre></div><p class="text-secondary-700 text-sm mt-3">지원되는 모든 옵션은 <a href="/docs/configuration" class="text-primary-600 hover:text-primary-700">구성 문서</a>에서 확인하세요.</p></section><section class="bg-secondary-50 rounded-lg p-6"><h3 class="font-semibold text-secondary-900 mb-4">배포 전 체크리스트</h3><ul class="space-y-2 text-secondary-700 text-sm"><li>비밀 값과 환경 변수를 구성합니다.</li><li>영구 스토리지와 데이터베이스 백업을 준비합니다.</li><li>TLS, 모니터링, 중앙 로그 수집을 활성화합니다.</li><li>인증, 네트워크, 확장 정책을 검증합니다.</li></ul></section></div></div>`,
    ja: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">ドキュメント</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">デプロイ</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">デプロイ</h1><p class="text-lg text-secondary-600">規模やコンプライアンス要件に合わせて Local.LLM を導入します。</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">デプロイ方法</h2><div class="space-y-6"><div class="border border-secondary-200 rounded-lg p-6"><h3 class="font-semibold text-secondary-900 mb-2">Docker</h3><p class="text-secondary-700 text-sm mb-3">単一ホストや小規模クラスタに素早く再現性のある導入を行う方法です。</p><a href="/docs/deployment-docker" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Docker デプロイガイドを見る →</a></div><div class="border border-secondary-200 rounded-lg p-6"><h3 class="font-semibold text-secondary-900 mb-2">Kubernetes</h3><p class="text-secondary-700 text-sm mb-3">自動化、水平スケーリング、高可用性が必要な場合に適しています。</p><a href="/docs/deployment-kubernetes" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Kubernetes デプロイガイドを見る →</a></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">環境設定</h2><p class="text-secondary-700 mb-4">Local.LLM は環境変数で設定します。代表的な本番設定は次のとおりです。</p><div class="bg-black rounded-lg p-4 overflow-x-auto"><pre class="text-white text-sm font-mono"><code># Server
PORT=3000
NODE_ENV=production

# Database
DB_URL=postgresql://user:pass@localhost:5432/local_llm

# Authentication
JWT_SECRET=your-secret-key
API_KEY=your-api-key

# AI Models
MODEL_CACHE_SIZE=10gb
MAX_CONCURRENT_REQUESTS=5

# Deployment
DEPLOYMENT_MODE=self-hosted
ENABLE_GPU=false</code></pre></div><p class="text-secondary-700 text-sm mt-3">すべての設定項目は <a href="/docs/configuration" class="text-primary-600 hover:text-primary-700">設定リファレンス</a> を参照してください。</p></section><section class="bg-secondary-50 rounded-lg p-6"><h3 class="font-semibold text-secondary-900 mb-4">デプロイ前チェックリスト</h3><ul class="space-y-2 text-secondary-700 text-sm"><li>シークレットと環境変数を設定する。</li><li>永続ストレージとデータベースバックアップを準備する。</li><li>TLS、監視、集中ログ収集を有効化する。</li><li>認証、ネットワーク、スケーリング方針を確認する。</li></ul></section></div></div>`,
    ru: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Документация</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Развёртывание</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Развёртывание</h1><p class="text-lg text-secondary-600">Разворачивайте Local.LLM на инфраструктуре, подходящей по масштабу и требованиям безопасности.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Варианты развёртывания</h2><div class="space-y-6"><div class="border border-secondary-200 rounded-lg p-6"><h3 class="font-semibold text-secondary-900 mb-2">Docker</h3><p class="text-secondary-700 text-sm mb-3">Подходит для быстрого и повторяемого запуска на одном сервере или небольшом кластере.</p><a href="/docs/deployment-docker" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Открыть руководство по Docker →</a></div><div class="border border-secondary-200 rounded-lg p-6"><h3 class="font-semibold text-secondary-900 mb-2">Kubernetes</h3><p class="text-secondary-700 text-sm mb-3">Выбирайте Kubernetes, если нужны автоматизация, горизонтальное масштабирование и высокая доступность.</p><a href="/docs/deployment-kubernetes" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Открыть руководство по Kubernetes →</a></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Конфигурация окружения</h2><p class="text-secondary-700 mb-4">Local.LLM настраивается через переменные окружения. Базовый пример для продакшена выглядит так:</p><div class="bg-black rounded-lg p-4 overflow-x-auto"><pre class="text-white text-sm font-mono"><code># Server
PORT=3000
NODE_ENV=production

# Database
DB_URL=postgresql://user:pass@localhost:5432/local_llm

# Authentication
JWT_SECRET=your-secret-key
API_KEY=your-api-key

# AI Models
MODEL_CACHE_SIZE=10gb
MAX_CONCURRENT_REQUESTS=5

# Deployment
DEPLOYMENT_MODE=self-hosted
ENABLE_GPU=false</code></pre></div><p class="text-secondary-700 text-sm mt-3">Полный список параметров смотрите в <a href="/docs/configuration" class="text-primary-600 hover:text-primary-700">справочнике по конфигурации</a>.</p></section><section class="bg-secondary-50 rounded-lg p-6"><h3 class="font-semibold text-secondary-900 mb-4">Чеклист перед запуском</h3><ul class="space-y-2 text-secondary-700 text-sm"><li>Настройте секреты и переменные окружения.</li><li>Подготовьте постоянное хранилище и резервное копирование базы данных.</li><li>Включите TLS, мониторинг и централизованное логирование.</li><li>Проверьте аутентификацию, сеть и правила масштабирования.</li></ul></section></div></div>`,
  },
  'deployment-docker': {
    en: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/deployment" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Deployment</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Docker</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Docker Deployment</h1><p class="text-lg text-secondary-600">Use Docker for a consistent Local.LLM deployment on a single host or small environment.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Prerequisites</h2><ul class="space-y-2 text-secondary-700"><li>Docker Engine 20.10 or later.</li><li>Docker Compose for multi-container environments.</li><li>At least 4GB RAM and 10GB disk for application data and models.</li></ul></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Quick Start</h2><p class="text-secondary-700 mb-4">Run Local.LLM with the official image:</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">docker run -d \
  --name local-llm \
  -p 3000:3000 \
  -e JWT_SECRET=your-secret-key \
  -e API_KEY=your-api-key \
  -v local_llm_data:/app/data \
  locallm/local-llm:latest</pre></div><p class="text-secondary-700 text-sm">The application will be available at <code class="bg-secondary-100 px-2 py-1 rounded">http://localhost:3000</code>.</p></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Docker Compose</h2><p class="text-secondary-700 mb-4">For a more complete setup, combine Local.LLM with PostgreSQL:</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">version: '3.8'
services:
  local-llm:
    image: locallm/local-llm:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your-secret-key
      - API_KEY=your-api-key
      - DB_URL=postgresql://user:password@postgres:5432/local_llm
  postgres:
    image: postgres:15-alpine</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Operational Tips</h2><ul class="space-y-2 text-secondary-700"><li>Mount persistent volumes for <code class="bg-secondary-100 px-2 py-1 rounded">/app/data</code> and model caches.</li><li>Use a reverse proxy such as nginx or Traefik for TLS termination.</li><li>Enable GPU support only after installing NVIDIA Container Toolkit on the host.</li></ul></section><section class="bg-primary-50 rounded-lg p-6 border border-primary-200"><h3 class="font-semibold text-secondary-900 mb-3">Next Steps</h3><ul class="space-y-2 text-secondary-700"><li><a href="/docs/configuration" class="text-primary-600 hover:text-primary-700 font-medium">Configuration Guide</a> — review environment variables and secrets.</li><li><a href="/docs/troubleshooting" class="text-primary-600 hover:text-primary-700 font-medium">Troubleshooting</a> — diagnose startup and connectivity issues.</li></ul></section></div></div>`,
    ko: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">문서</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/deployment" class="text-primary-600 hover:text-primary-700 text-sm font-medium">배포</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Docker</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Docker 배포</h1><p class="text-lg text-secondary-600">단일 호스트나 소규모 환경에서 일관된 Local.LLM 배포를 위해 Docker를 사용하세요.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">사전 준비</h2><ul class="space-y-2 text-secondary-700"><li>Docker Engine 20.10 이상.</li><li>여러 컨테이너 환경을 위한 Docker Compose.</li><li>애플리케이션 데이터와 모델을 위한 최소 4GB RAM 및 10GB 디스크.</li></ul></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">빠른 시작</h2><p class="text-secondary-700 mb-4">공식 이미지를 사용해 Local.LLM을 실행합니다.</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">docker run -d \
  --name local-llm \
  -p 3000:3000 \
  -e JWT_SECRET=your-secret-key \
  -e API_KEY=your-api-key \
  -v local_llm_data:/app/data \
  locallm/local-llm:latest</pre></div><p class="text-secondary-700 text-sm">애플리케이션은 <code class="bg-secondary-100 px-2 py-1 rounded">http://localhost:3000</code> 에서 사용할 수 있습니다.</p></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Docker Compose</h2><p class="text-secondary-700 mb-4">보다 완전한 구성을 위해 PostgreSQL과 함께 Local.LLM을 배치할 수 있습니다.</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">version: '3.8'
services:
  local-llm:
    image: locallm/local-llm:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your-secret-key
      - API_KEY=your-api-key
      - DB_URL=postgresql://user:password@postgres:5432/local_llm
  postgres:
    image: postgres:15-alpine</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">운영 팁</h2><ul class="space-y-2 text-secondary-700"><li><code class="bg-secondary-100 px-2 py-1 rounded">/app/data</code> 및 모델 캐시를 위한 영구 볼륨을 마운트하세요.</li><li>TLS 종료를 위해 nginx 또는 Traefik 같은 리버스 프록시를 사용하세요.</li><li>호스트에 NVIDIA Container Toolkit을 설치한 후에만 GPU 지원을 활성화하세요.</li></ul></section><section class="bg-primary-50 rounded-lg p-6 border border-primary-200"><h3 class="font-semibold text-secondary-900 mb-3">다음 단계</h3><ul class="space-y-2 text-secondary-700"><li><a href="/docs/configuration" class="text-primary-600 hover:text-primary-700 font-medium">구성 가이드</a> — 환경 변수와 비밀 값을 검토하세요.</li><li><a href="/docs/troubleshooting" class="text-primary-600 hover:text-primary-700 font-medium">문제 해결</a> — 시작 및 연결 문제를 진단하세요.</li></ul></section></div></div>`,
    ja: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">ドキュメント</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/deployment" class="text-primary-600 hover:text-primary-700 text-sm font-medium">デプロイ</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Docker</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Docker デプロイ</h1><p class="text-lg text-secondary-600">単一ホストや小規模環境で一貫した Local.LLM デプロイを行うには Docker を使用します。</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">前提条件</h2><ul class="space-y-2 text-secondary-700"><li>Docker Engine 20.10 以降。</li><li>複数コンテナ構成向けの Docker Compose。</li><li>アプリデータとモデル用に 4GB RAM と 10GB ディスク以上。</li></ul></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">クイックスタート</h2><p class="text-secondary-700 mb-4">公式イメージで Local.LLM を起動します。</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">docker run -d \
  --name local-llm \
  -p 3000:3000 \
  -e JWT_SECRET=your-secret-key \
  -e API_KEY=your-api-key \
  -v local_llm_data:/app/data \
  locallm/local-llm:latest</pre></div><p class="text-secondary-700 text-sm">アプリケーションは <code class="bg-secondary-100 px-2 py-1 rounded">http://localhost:3000</code> で利用できます。</p></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Docker Compose</h2><p class="text-secondary-700 mb-4">より完全な構成では PostgreSQL と組み合わせます。</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">version: '3.8'
services:
  local-llm:
    image: locallm/local-llm:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your-secret-key
      - API_KEY=your-api-key
      - DB_URL=postgresql://user:password@postgres:5432/local_llm
  postgres:
    image: postgres:15-alpine</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">運用のポイント</h2><ul class="space-y-2 text-secondary-700"><li><code class="bg-secondary-100 px-2 py-1 rounded">/app/data</code> とモデルキャッシュに永続ボリュームを割り当てます。</li><li>TLS 終端には nginx や Traefik などのリバースプロキシを利用します。</li><li>GPU サポートはホストに NVIDIA Container Toolkit を導入してから有効化します。</li></ul></section><section class="bg-primary-50 rounded-lg p-6 border border-primary-200"><h3 class="font-semibold text-secondary-900 mb-3">次のステップ</h3><ul class="space-y-2 text-secondary-700"><li><a href="/docs/configuration" class="text-primary-600 hover:text-primary-700 font-medium">設定ガイド</a> — 環境変数とシークレットを確認します。</li><li><a href="/docs/troubleshooting" class="text-primary-600 hover:text-primary-700 font-medium">トラブルシューティング</a> — 起動や接続の問題を診断します。</li></ul></section></div></div>`,
    ru: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Документация</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/deployment" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Развёртывание</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Docker</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Развёртывание через Docker</h1><p class="text-lg text-secondary-600">Используйте Docker для стабильного запуска Local.LLM на одном сервере или в небольшой среде.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Предварительные требования</h2><ul class="space-y-2 text-secondary-700"><li>Docker Engine 20.10 или новее.</li><li>Docker Compose для многоконтейнерных сред.</li><li>Не менее 4GB RAM и 10GB диска для данных приложения и моделей.</li></ul></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Быстрый старт</h2><p class="text-secondary-700 mb-4">Запустите Local.LLM с помощью официального образа.</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">docker run -d \
  --name local-llm \
  -p 3000:3000 \
  -e JWT_SECRET=your-secret-key \
  -e API_KEY=your-api-key \
  -v local_llm_data:/app/data \
  locallm/local-llm:latest</pre></div><p class="text-secondary-700 text-sm">Приложение будет доступно по адресу <code class="bg-secondary-100 px-2 py-1 rounded">http://localhost:3000</code>.</p></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Docker Compose</h2><p class="text-secondary-700 mb-4">Для более полной конфигурации используйте Local.LLM вместе с PostgreSQL.</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">version: '3.8'
services:
  local-llm:
    image: locallm/local-llm:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your-secret-key
      - API_KEY=your-api-key
      - DB_URL=postgresql://user:password@postgres:5432/local_llm
  postgres:
    image: postgres:15-alpine</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Советы по эксплуатации</h2><ul class="space-y-2 text-secondary-700"><li>Подключите постоянные тома для <code class="bg-secondary-100 px-2 py-1 rounded">/app/data</code> и кэша моделей.</li><li>Используйте reverse proxy, например nginx или Traefik, для TLS.</li><li>Включайте GPU только после установки NVIDIA Container Toolkit на хосте.</li></ul></section><section class="bg-primary-50 rounded-lg p-6 border border-primary-200"><h3 class="font-semibold text-secondary-900 mb-3">Что дальше</h3><ul class="space-y-2 text-secondary-700"><li><a href="/docs/configuration" class="text-primary-600 hover:text-primary-700 font-medium">Руководство по конфигурации</a> — проверьте переменные окружения и секреты.</li><li><a href="/docs/troubleshooting" class="text-primary-600 hover:text-primary-700 font-medium">Устранение неполадок</a> — диагностируйте проблемы запуска и соединения.</li></ul></section></div></div>`,
  },
  'deployment-kubernetes': {
    en: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/deployment" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Deployment</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Kubernetes</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Kubernetes Deployment</h1><p class="text-lg text-secondary-600">Use Kubernetes when you need orchestration, high availability, and automated scaling for Local.LLM.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Prerequisites</h2><ul class="space-y-2 text-secondary-700"><li>A Kubernetes cluster with enough CPU, memory, and storage.</li><li><code class="bg-secondary-100 px-2 py-1 rounded">kubectl</code> access and an image registry strategy.</li><li>Persistent volumes for application data and model caches.</li></ul></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Base Deployment</h2><p class="text-secondary-700 mb-4">A minimal manifest should define a namespace, secrets, config, deployment, service, and persistent volume claims.</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">apiVersion: apps/v1
kind: Deployment
metadata:
  name: local-llm
spec:
  replicas: 3
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
          ports:
            - containerPort: 3000</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Ingress and Storage</h2><p class="text-secondary-700">Expose the service with an Ingress controller, terminate TLS there, and choose a storage class that supports your backup and performance requirements.</p></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Operations</h2><ul class="space-y-2 text-secondary-700"><li>Collect metrics with Prometheus and dashboards with Grafana.</li><li>Use readiness and liveness probes for safe rolling deployments.</li><li>Prefer managed PostgreSQL in production when possible.</li></ul></section><section class="bg-primary-50 rounded-lg p-6 border border-primary-200"><h3 class="font-semibold text-secondary-900 mb-3">Troubleshooting</h3><ul class="space-y-2 text-secondary-700"><li>Run <code class="bg-white px-1">kubectl describe pod</code> if pods do not start.</li><li>Check PVC and storage class status when volumes stay pending.</li><li>Inspect ingress DNS and service endpoints for connectivity issues.</li></ul></section></div></div>`,
    ko: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">문서</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/deployment" class="text-primary-600 hover:text-primary-700 text-sm font-medium">배포</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Kubernetes</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Kubernetes 배포</h1><p class="text-lg text-secondary-600">Local.LLM에 오케스트레이션, 고가용성, 자동 확장이 필요하다면 Kubernetes를 사용하세요.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">사전 준비</h2><ul class="space-y-2 text-secondary-700"><li>충분한 CPU, 메모리, 스토리지를 갖춘 Kubernetes 클러스터.</li><li><code class="bg-secondary-100 px-2 py-1 rounded">kubectl</code> 접근 권한과 이미지 레지스트리 전략.</li><li>애플리케이션 데이터와 모델 캐시를 위한 영구 볼륨.</li></ul></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">기본 배포</h2><p class="text-secondary-700 mb-4">최소 매니페스트에는 네임스페이스, 비밀 값, 구성, 배포, 서비스, PVC가 포함되어야 합니다.</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">apiVersion: apps/v1
kind: Deployment
metadata:
  name: local-llm
spec:
  replicas: 3
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
          ports:
            - containerPort: 3000</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Ingress 및 스토리지</h2><p class="text-secondary-700">Ingress 컨트롤러로 서비스를 외부에 노출하고, 그 지점에서 TLS를 종료하며, 백업 및 성능 요구 사항에 맞는 스토리지 클래스를 선택하세요.</p></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">운영</h2><ul class="space-y-2 text-secondary-700"><li>Prometheus로 메트릭을 수집하고 Grafana로 대시보드를 구성합니다.</li><li>안전한 롤링 배포를 위해 readiness/liveness probe를 사용합니다.</li><li>가능하면 프로덕션에서는 관리형 PostgreSQL을 사용하는 것이 좋습니다.</li></ul></section><section class="bg-primary-50 rounded-lg p-6 border border-primary-200"><h3 class="font-semibold text-secondary-900 mb-3">문제 해결</h3><ul class="space-y-2 text-secondary-700"><li>파드가 시작되지 않으면 <code class="bg-white px-1">kubectl describe pod</code>를 실행하세요.</li><li>볼륨이 Pending 상태면 PVC와 스토리지 클래스를 확인하세요.</li><li>연결 문제가 있으면 ingress DNS와 서비스 엔드포인트를 점검하세요.</li></ul></section></div></div>`,
    ja: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">ドキュメント</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/deployment" class="text-primary-600 hover:text-primary-700 text-sm font-medium">デプロイ</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Kubernetes</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Kubernetes デプロイ</h1><p class="text-lg text-secondary-600">Local.LLM にオーケストレーション、高可用性、自動スケーリングが必要な場合は Kubernetes を使います。</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">前提条件</h2><ul class="space-y-2 text-secondary-700"><li>十分な CPU、メモリ、ストレージを持つ Kubernetes クラスタ。</li><li><code class="bg-secondary-100 px-2 py-1 rounded">kubectl</code> のアクセス権とイメージレジストリ運用。</li><li>アプリデータとモデルキャッシュ用の永続ボリューム。</li></ul></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">基本デプロイ</h2><p class="text-secondary-700 mb-4">最小構成のマニフェストには namespace、secret、config、deployment、service、PVC が必要です。</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">apiVersion: apps/v1
kind: Deployment
metadata:
  name: local-llm
spec:
  replicas: 3
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
          ports:
            - containerPort: 3000</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Ingress とストレージ</h2><p class="text-secondary-700">Ingress コントローラでサービスを公開し、そこで TLS を終端し、バックアップと性能要件に合ったストレージクラスを選択します。</p></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">運用</h2><ul class="space-y-2 text-secondary-700"><li>Prometheus でメトリクスを収集し、Grafana で可視化します。</li><li>安全なローリング更新のため readiness / liveness probe を使います。</li><li>本番では可能ならマネージド PostgreSQL を利用してください。</li></ul></section><section class="bg-primary-50 rounded-lg p-6 border border-primary-200"><h3 class="font-semibold text-secondary-900 mb-3">トラブルシューティング</h3><ul class="space-y-2 text-secondary-700"><li>Pod が起動しない場合は <code class="bg-white px-1">kubectl describe pod</code> を実行します。</li><li>ボリュームが Pending のままなら PVC とストレージクラスを確認します。</li><li>接続問題がある場合は ingress の DNS と service endpoint を確認します。</li></ul></section></div></div>`,
    ru: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Документация</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/deployment" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Развёртывание</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Kubernetes</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Развёртывание в Kubernetes</h1><p class="text-lg text-secondary-600">Используйте Kubernetes, когда для Local.LLM нужны оркестрация, высокая доступность и автоматическое масштабирование.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Предварительные требования</h2><ul class="space-y-2 text-secondary-700"><li>Кластер Kubernetes с достаточными CPU, памятью и хранилищем.</li><li>Доступ через <code class="bg-secondary-100 px-2 py-1 rounded">kubectl</code> и стратегия работы с реестром образов.</li><li>Постоянные тома для данных приложения и кэша моделей.</li></ul></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Базовое развёртывание</h2><p class="text-secondary-700 mb-4">Минимальный манифест должен описывать namespace, secret, config, deployment, service и PVC.</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">apiVersion: apps/v1
kind: Deployment
metadata:
  name: local-llm
spec:
  replicas: 3
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
          ports:
            - containerPort: 3000</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Ingress и хранилище</h2><p class="text-secondary-700">Публикуйте сервис через Ingress-контроллер, завершайте TLS на нём и выбирайте storage class с учётом резервного копирования и производительности.</p></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Эксплуатация</h2><ul class="space-y-2 text-secondary-700"><li>Собирайте метрики через Prometheus и визуализируйте их в Grafana.</li><li>Используйте readiness и liveness probes для безопасных rolling update.</li><li>В продакшене по возможности выбирайте managed PostgreSQL.</li></ul></section><section class="bg-primary-50 rounded-lg p-6 border border-primary-200"><h3 class="font-semibold text-secondary-900 mb-3">Устранение неполадок</h3><ul class="space-y-2 text-secondary-700"><li>Если pod не стартует, выполните <code class="bg-white px-1">kubectl describe pod</code>.</li><li>Если тома зависли в Pending, проверьте PVC и storage class.</li><li>При проблемах с доступом проверьте DNS ingress и endpoints сервиса.</li></ul></section></div></div>`,
  },
  configuration: {
    en: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Configuration</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Configuration</h1><p class="text-lg text-secondary-600">Reference the most important environment variables used to configure Local.LLM.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Server</h2><div class="space-y-4"><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">PORT</h4><p class="text-secondary-700 text-sm">HTTP port for the application. Default: <code class="bg-secondary-100 px-2 py-1 rounded">3000</code>.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">NODE_ENV</h4><p class="text-secondary-700 text-sm">Runtime mode such as <code class="bg-secondary-100 px-2 py-1 rounded">development</code>, <code class="bg-secondary-100 px-2 py-1 rounded">production</code>, or <code class="bg-secondary-100 px-2 py-1 rounded">test</code>.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">LOG_LEVEL</h4><p class="text-secondary-700 text-sm">Verbosity for application logs. Common values: debug, info, warn, error.</p></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Security</h2><div class="space-y-4"><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">JWT_SECRET</h4><p class="text-secondary-700 text-sm">Signing secret for JWT tokens. Use a long, random value and rotate it through your secret manager.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">API_KEY</h4><p class="text-secondary-700 text-sm">Service-to-service authentication key. Never commit it or expose it in client-side code.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">CORS_ORIGINS</h4><p class="text-secondary-700 text-sm">Comma-separated list of allowed origins for browser clients.</p></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">AI Models</h2><div class="space-y-4"><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">MODEL_CACHE_SIZE</h4><p class="text-secondary-700 text-sm">Maximum disk or memory budget used for cached models.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">MAX_CONCURRENT_REQUESTS</h4><p class="text-secondary-700 text-sm">Upper bound for simultaneous API work handled by the service.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">ENABLE_GPU</h4><p class="text-secondary-700 text-sm">Set to <code class="bg-secondary-100 px-2 py-1 rounded">true</code> when GPU acceleration is available and configured.</p></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Example</h2><div class="bg-black rounded-lg p-4 overflow-x-auto"><pre class="text-white text-sm font-mono">PORT=3000
NODE_ENV=production
LOG_LEVEL=info
JWT_SECRET=your-very-secure-random-jwt-secret
API_KEY=your-very-secure-random-api-key
DB_URL=postgresql://user:password@db.example.com:5432/local_llm
MODEL_CACHE_SIZE=20gb
MAX_CONCURRENT_REQUESTS=10
DEPLOYMENT_MODE=self-hosted
ENABLE_GPU=false</pre></div></section></div></div>`,
    ko: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">문서</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">구성</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">구성</h1><p class="text-lg text-secondary-600">Local.LLM 구성에 자주 사용하는 핵심 환경 변수를 확인하세요.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">서버</h2><div class="space-y-4"><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">PORT</h4><p class="text-secondary-700 text-sm">애플리케이션의 HTTP 포트입니다. 기본값은 <code class="bg-secondary-100 px-2 py-1 rounded">3000</code> 입니다.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">NODE_ENV</h4><p class="text-secondary-700 text-sm"><code class="bg-secondary-100 px-2 py-1 rounded">development</code>, <code class="bg-secondary-100 px-2 py-1 rounded">production</code>, <code class="bg-secondary-100 px-2 py-1 rounded">test</code> 같은 런타임 모드입니다.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">LOG_LEVEL</h4><p class="text-secondary-700 text-sm">애플리케이션 로그의 상세 수준입니다. 일반적인 값: debug, info, warn, error.</p></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">보안</h2><div class="space-y-4"><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">JWT_SECRET</h4><p class="text-secondary-700 text-sm">JWT 토큰 서명용 비밀 값입니다. 길고 무작위인 값을 사용하고 비밀 관리 도구로 교체하세요.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">API_KEY</h4><p class="text-secondary-700 text-sm">서비스 간 인증용 키입니다. 커밋하거나 클라이언트 코드에 노출하지 마세요.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">CORS_ORIGINS</h4><p class="text-secondary-700 text-sm">브라우저 클라이언트에 허용할 origin 목록입니다.</p></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">AI 모델</h2><div class="space-y-4"><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">MODEL_CACHE_SIZE</h4><p class="text-secondary-700 text-sm">캐시된 모델에 사용할 최대 디스크 또는 메모리 용량입니다.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">MAX_CONCURRENT_REQUESTS</h4><p class="text-secondary-700 text-sm">서비스가 동시에 처리할 API 작업의 상한입니다.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">ENABLE_GPU</h4><p class="text-secondary-700 text-sm">GPU 가속이 준비되었다면 <code class="bg-secondary-100 px-2 py-1 rounded">true</code> 로 설정하세요.</p></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">예시</h2><div class="bg-black rounded-lg p-4 overflow-x-auto"><pre class="text-white text-sm font-mono">PORT=3000
NODE_ENV=production
LOG_LEVEL=info
JWT_SECRET=your-very-secure-random-jwt-secret
API_KEY=your-very-secure-random-api-key
DB_URL=postgresql://user:password@db.example.com:5432/local_llm
MODEL_CACHE_SIZE=20gb
MAX_CONCURRENT_REQUESTS=10
DEPLOYMENT_MODE=self-hosted
ENABLE_GPU=false</pre></div></section></div></div>`,
    ja: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">ドキュメント</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">設定</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">設定</h1><p class="text-lg text-secondary-600">Local.LLM の設定で重要になる代表的な環境変数を確認します。</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">サーバー</h2><div class="space-y-4"><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">PORT</h4><p class="text-secondary-700 text-sm">アプリケーションの HTTP ポートです。既定値は <code class="bg-secondary-100 px-2 py-1 rounded">3000</code> です。</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">NODE_ENV</h4><p class="text-secondary-700 text-sm"><code class="bg-secondary-100 px-2 py-1 rounded">development</code>、<code class="bg-secondary-100 px-2 py-1 rounded">production</code>、<code class="bg-secondary-100 px-2 py-1 rounded">test</code> などの実行モードです。</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">LOG_LEVEL</h4><p class="text-secondary-700 text-sm">アプリケーションログの詳細度です。代表的な値: debug, info, warn, error.</p></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">セキュリティ</h2><div class="space-y-4"><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">JWT_SECRET</h4><p class="text-secondary-700 text-sm">JWT 署名用シークレットです。十分に長くランダムな値を使用し、secret manager で管理してください。</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">API_KEY</h4><p class="text-secondary-700 text-sm">サービス間認証用のキーです。コミットしたりクライアントコードに埋め込んだりしないでください。</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">CORS_ORIGINS</h4><p class="text-secondary-700 text-sm">ブラウザクライアントに許可する origin の一覧です。</p></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">AI モデル</h2><div class="space-y-4"><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">MODEL_CACHE_SIZE</h4><p class="text-secondary-700 text-sm">キャッシュされたモデルに割り当てる最大ディスクまたはメモリ量です。</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">MAX_CONCURRENT_REQUESTS</h4><p class="text-secondary-700 text-sm">サービスが同時に処理する API 作業の上限です。</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">ENABLE_GPU</h4><p class="text-secondary-700 text-sm">GPU 高速化が利用可能な場合は <code class="bg-secondary-100 px-2 py-1 rounded">true</code> に設定します。</p></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">例</h2><div class="bg-black rounded-lg p-4 overflow-x-auto"><pre class="text-white text-sm font-mono">PORT=3000
NODE_ENV=production
LOG_LEVEL=info
JWT_SECRET=your-very-secure-random-jwt-secret
API_KEY=your-very-secure-random-api-key
DB_URL=postgresql://user:password@db.example.com:5432/local_llm
MODEL_CACHE_SIZE=20gb
MAX_CONCURRENT_REQUESTS=10
DEPLOYMENT_MODE=self-hosted
ENABLE_GPU=false</pre></div></section></div></div>`,
    ru: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Документация</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Конфигурация</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Конфигурация</h1><p class="text-lg text-secondary-600">Справка по ключевым переменным окружения, которые используются для настройки Local.LLM.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Сервер</h2><div class="space-y-4"><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">PORT</h4><p class="text-secondary-700 text-sm">HTTP-порт приложения. Значение по умолчанию — <code class="bg-secondary-100 px-2 py-1 rounded">3000</code>.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">NODE_ENV</h4><p class="text-secondary-700 text-sm">Режим работы: <code class="bg-secondary-100 px-2 py-1 rounded">development</code>, <code class="bg-secondary-100 px-2 py-1 rounded">production</code> или <code class="bg-secondary-100 px-2 py-1 rounded">test</code>.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">LOG_LEVEL</h4><p class="text-secondary-700 text-sm">Подробность логов приложения. Частые значения: debug, info, warn, error.</p></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Безопасность</h2><div class="space-y-4"><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">JWT_SECRET</h4><p class="text-secondary-700 text-sm">Секрет для подписи JWT. Используйте длинное случайное значение и храните его в менеджере секретов.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">API_KEY</h4><p class="text-secondary-700 text-sm">Ключ для межсервисной аутентификации. Не коммитьте его и не размещайте в клиентском коде.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">CORS_ORIGINS</h4><p class="text-secondary-700 text-sm">Список origin'ов браузерных клиентов, разделённых запятыми.</p></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Модели ИИ</h2><div class="space-y-4"><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">MODEL_CACHE_SIZE</h4><p class="text-secondary-700 text-sm">Максимальный объём диска или памяти для кэша моделей.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">MAX_CONCURRENT_REQUESTS</h4><p class="text-secondary-700 text-sm">Верхняя граница числа API-запросов, которые сервис обрабатывает одновременно.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h4 class="font-semibold text-secondary-900 mb-2">ENABLE_GPU</h4><p class="text-secondary-700 text-sm">Установите <code class="bg-secondary-100 px-2 py-1 rounded">true</code>, если GPU-ускорение доступно и настроено.</p></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Пример</h2><div class="bg-black rounded-lg p-4 overflow-x-auto"><pre class="text-white text-sm font-mono">PORT=3000
NODE_ENV=production
LOG_LEVEL=info
JWT_SECRET=your-very-secure-random-jwt-secret
API_KEY=your-very-secure-random-api-key
DB_URL=postgresql://user:password@db.example.com:5432/local_llm
MODEL_CACHE_SIZE=20gb
MAX_CONCURRENT_REQUESTS=10
DEPLOYMENT_MODE=self-hosted
ENABLE_GPU=false</pre></div></section></div></div>`,
  },
  troubleshooting: {
    en: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Troubleshooting</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Troubleshooting</h1><p class="text-lg text-secondary-600">Use this page to diagnose the most common Local.LLM deployment issues.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Common Issues</h2><div class="space-y-4"><div class="border border-secondary-200 rounded-lg p-4"><h3 class="font-semibold text-secondary-900 mb-2">Application does not start</h3><p class="text-secondary-700 text-sm">Check application logs first, then verify required environment variables such as <code class="bg-secondary-100 px-2 py-1 rounded">JWT_SECRET</code> and <code class="bg-secondary-100 px-2 py-1 rounded">API_KEY</code>.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h3 class="font-semibold text-secondary-900 mb-2">Out of memory</h3><p class="text-secondary-700 text-sm">Reduce model cache size, lower concurrent request limits, or add more memory to the host.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h3 class="font-semibold text-secondary-900 mb-2">Database connection failures</h3><p class="text-secondary-700 text-sm">Confirm the database is reachable, credentials are correct, and the <code class="bg-secondary-100 px-2 py-1 rounded">DB_URL</code> format is valid.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h3 class="font-semibold text-secondary-900 mb-2">Authentication errors</h3><p class="text-secondary-700 text-sm">Check bearer tokens, API keys, token expiration, and secret consistency across deployments.</p></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Performance Tips</h2><ul class="space-y-2 text-secondary-700"><li>Use GPU acceleration when available.</li><li>Keep frequently used models warm in cache.</li><li>Monitor latency, CPU, memory, and request concurrency.</li></ul></section><section class="bg-secondary-50 rounded-lg p-6"><h2 class="text-2xl font-bold text-secondary-900 mb-4">Get Help</h2><ul class="space-y-3 text-secondary-700"><li>Review the <a href="/docs" class="text-primary-600 hover:text-primary-700 font-medium">full documentation</a>.</li><li>Ask your team or community channel for deployment-specific guidance.</li><li>Include logs, configuration context, and reproduction steps when reporting an issue.</li></ul></section></div></div>`,
    ko: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">문서</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">문제 해결</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">문제 해결</h1><p class="text-lg text-secondary-600">자주 발생하는 Local.LLM 배포 문제를 진단할 때 이 페이지를 사용하세요.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">일반적인 문제</h2><div class="space-y-4"><div class="border border-secondary-200 rounded-lg p-4"><h3 class="font-semibold text-secondary-900 mb-2">애플리케이션이 시작되지 않음</h3><p class="text-secondary-700 text-sm">먼저 로그를 확인하고 <code class="bg-secondary-100 px-2 py-1 rounded">JWT_SECRET</code>, <code class="bg-secondary-100 px-2 py-1 rounded">API_KEY</code> 같은 필수 환경 변수가 설정되어 있는지 검증하세요.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h3 class="font-semibold text-secondary-900 mb-2">메모리 부족</h3><p class="text-secondary-700 text-sm">모델 캐시 크기를 줄이고 동시 요청 수를 낮추거나 호스트 메모리를 늘리세요.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h3 class="font-semibold text-secondary-900 mb-2">데이터베이스 연결 실패</h3><p class="text-secondary-700 text-sm">데이터베이스 접근 가능 여부, 자격 증명, <code class="bg-secondary-100 px-2 py-1 rounded">DB_URL</code> 형식을 확인하세요.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h3 class="font-semibold text-secondary-900 mb-2">인증 오류</h3><p class="text-secondary-700 text-sm">Bearer 토큰, API 키, 토큰 만료, 배포 간 비밀 값 일치를 점검하세요.</p></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">성능 팁</h2><ul class="space-y-2 text-secondary-700"><li>가능하면 GPU 가속을 사용하세요.</li><li>자주 사용하는 모델은 캐시에 유지하세요.</li><li>지연 시간, CPU, 메모리, 동시 요청 수를 모니터링하세요.</li></ul></section><section class="bg-secondary-50 rounded-lg p-6"><h2 class="text-2xl font-bold text-secondary-900 mb-4">도움 받기</h2><ul class="space-y-3 text-secondary-700"><li><a href="/docs" class="text-primary-600 hover:text-primary-700 font-medium">전체 문서</a>를 다시 확인하세요.</li><li>배포 환경별 조언은 팀이나 커뮤니티 채널에 문의하세요.</li><li>이슈를 보고할 때는 로그, 구성 정보, 재현 단계를 포함하세요.</li></ul></section></div></div>`,
    ja: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">ドキュメント</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">トラブルシューティング</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">トラブルシューティング</h1><p class="text-lg text-secondary-600">よくある Local.LLM のデプロイ問題を診断するときに利用してください。</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">よくある問題</h2><div class="space-y-4"><div class="border border-secondary-200 rounded-lg p-4"><h3 class="font-semibold text-secondary-900 mb-2">アプリが起動しない</h3><p class="text-secondary-700 text-sm">まずログを確認し、<code class="bg-secondary-100 px-2 py-1 rounded">JWT_SECRET</code> や <code class="bg-secondary-100 px-2 py-1 rounded">API_KEY</code> などの必須環境変数を見直してください。</p></div><div class="border border-secondary-200 rounded-lg p-4"><h3 class="font-semibold text-secondary-900 mb-2">メモリ不足</h3><p class="text-secondary-700 text-sm">モデルキャッシュを減らす、同時リクエスト数を下げる、またはホストメモリを増やします。</p></div><div class="border border-secondary-200 rounded-lg p-4"><h3 class="font-semibold text-secondary-900 mb-2">データベース接続失敗</h3><p class="text-secondary-700 text-sm">データベース到達性、認証情報、<code class="bg-secondary-100 px-2 py-1 rounded">DB_URL</code> の形式を確認します。</p></div><div class="border border-secondary-200 rounded-lg p-4"><h3 class="font-semibold text-secondary-900 mb-2">認証エラー</h3><p class="text-secondary-700 text-sm">Bearer トークン、API キー、有効期限、各デプロイ間での secret の整合性を確認してください。</p></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">性能のヒント</h2><ul class="space-y-2 text-secondary-700"><li>利用可能なら GPU 高速化を使う。</li><li>頻繁に使うモデルをキャッシュで温めておく。</li><li>レイテンシ、CPU、メモリ、同時実行数を監視する。</li></ul></section><section class="bg-secondary-50 rounded-lg p-6"><h2 class="text-2xl font-bold text-secondary-900 mb-4">サポートを受ける</h2><ul class="space-y-3 text-secondary-700"><li><a href="/docs" class="text-primary-600 hover:text-primary-700 font-medium">全ドキュメント</a>を見直します。</li><li>導入環境固有の相談はチームやコミュニティチャネルへ。</li><li>不具合報告にはログ、設定情報、再現手順を含めてください。</li></ul></section></div></div>`,
    ru: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Документация</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Устранение неполадок</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Устранение неполадок</h1><p class="text-lg text-secondary-600">Используйте эту страницу для диагностики самых частых проблем при развёртывании Local.LLM.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Частые проблемы</h2><div class="space-y-4"><div class="border border-secondary-200 rounded-lg p-4"><h3 class="font-semibold text-secondary-900 mb-2">Приложение не запускается</h3><p class="text-secondary-700 text-sm">Сначала проверьте логи, затем убедитесь, что заданы обязательные переменные окружения, например <code class="bg-secondary-100 px-2 py-1 rounded">JWT_SECRET</code> и <code class="bg-secondary-100 px-2 py-1 rounded">API_KEY</code>.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h3 class="font-semibold text-secondary-900 mb-2">Нехватка памяти</h3><p class="text-secondary-700 text-sm">Уменьшите размер кэша моделей, снизьте лимит одновременных запросов или увеличьте объём памяти хоста.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h3 class="font-semibold text-secondary-900 mb-2">Ошибки подключения к базе данных</h3><p class="text-secondary-700 text-sm">Проверьте доступность базы, корректность учётных данных и формат <code class="bg-secondary-100 px-2 py-1 rounded">DB_URL</code>.</p></div><div class="border border-secondary-200 rounded-lg p-4"><h3 class="font-semibold text-secondary-900 mb-2">Ошибки аутентификации</h3><p class="text-secondary-700 text-sm">Проверьте bearer-токены, API-ключи, срок действия токенов и согласованность секретов между окружениями.</p></div></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Советы по производительности</h2><ul class="space-y-2 text-secondary-700"><li>Используйте GPU-ускорение, если оно доступно.</li><li>Держите часто используемые модели прогретыми в кэше.</li><li>Следите за задержкой, CPU, памятью и уровнем конкурентности.</li></ul></section><section class="bg-secondary-50 rounded-lg p-6"><h2 class="text-2xl font-bold text-secondary-900 mb-4">Где получить помощь</h2><ul class="space-y-3 text-secondary-700"><li>Пересмотрите <a href="/docs" class="text-primary-600 hover:text-primary-700 font-medium">полную документацию</a>.</li><li>Обратитесь к команде или в сообщество за советом по конкретному окружению.</li><li>При сообщении о проблеме приложите логи, контекст конфигурации и шаги воспроизведения.</li></ul></section></div></div>`,
  },
  'api-auth': {
    en: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 text-sm font-medium">API Reference</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Authentication</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Authentication</h1><p class="text-lg text-secondary-600">Authenticate Local.LLM API requests with API keys and session tokens.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Overview</h2><ul class="space-y-3 text-secondary-700"><li><strong>API keys</strong> are best for service-to-service communication and automation.</li><li><strong>JWT tokens</strong> are best for user sessions and browser-based applications.</li></ul></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">API Key Example</h2><p class="text-secondary-700 mb-4">Send the key in the <code class="bg-secondary-100 px-2 py-1 rounded">Authorization</code> header.</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">curl -X GET http://localhost:3000/api/models \
  -H "Authorization: Bearer YOUR_API_KEY"</pre></div><div class="bg-blue-50 border border-blue-200 rounded-lg p-4"><p class="text-sm text-blue-900"><strong>Security:</strong> treat API keys like passwords and keep them out of client-side bundles.</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">JWT Example</h2><p class="text-secondary-700 mb-4">Use a login flow to obtain a token for a user session.</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "password": "secure-password"
  }'</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Headers</h2><table class="w-full border-collapse mt-4"><thead><tr class="border-b-2 border-secondary-300"><th class="text-left py-2 px-3 font-semibold text-secondary-900">Header</th><th class="text-left py-2 px-3 font-semibold text-secondary-900">Description</th><th class="text-left py-2 px-3 font-semibold text-secondary-900">Required</th></tr></thead><tbody><tr class="border-b border-secondary-200"><td class="py-2 px-3 text-secondary-900"><code class="bg-secondary-100 px-2 py-1 rounded">Authorization</code></td><td class="py-2 px-3 text-secondary-700">Bearer token containing an API key or JWT.</td><td class="py-2 px-3 text-secondary-700">Yes</td></tr><tr><td class="py-2 px-3 text-secondary-900"><code class="bg-secondary-100 px-2 py-1 rounded">Content-Type</code></td><td class="py-2 px-3 text-secondary-700">Use <code class="bg-secondary-100 px-2 py-1 rounded">application/json</code> for request bodies.</td><td class="py-2 px-3 text-secondary-700">For POST/PUT</td></tr></tbody></table></section></div></div>`,
    ko: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">문서</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 text-sm font-medium">API 레퍼런스</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">인증</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">인증</h1><p class="text-lg text-secondary-600">API 키와 세션 토큰으로 Local.LLM API 요청을 인증합니다.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">개요</h2><ul class="space-y-3 text-secondary-700"><li><strong>API 키</strong>는 서비스 간 통신과 자동화에 적합합니다.</li><li><strong>JWT 토큰</strong>은 사용자 세션과 브라우저 기반 애플리케이션에 적합합니다.</li></ul></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">API 키 예시</h2><p class="text-secondary-700 mb-4"><code class="bg-secondary-100 px-2 py-1 rounded">Authorization</code> 헤더에 키를 전달합니다.</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">curl -X GET http://localhost:3000/api/models \
  -H "Authorization: Bearer YOUR_API_KEY"</pre></div><div class="bg-blue-50 border border-blue-200 rounded-lg p-4"><p class="text-sm text-blue-900"><strong>보안:</strong> API 키는 비밀번호처럼 다루고 클라이언트 번들에 포함하지 마세요.</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">JWT 예시</h2><p class="text-secondary-700 mb-4">로그인 흐름을 통해 사용자 세션용 토큰을 발급받습니다.</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "password": "secure-password"
  }'</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">헤더</h2><table class="w-full border-collapse mt-4"><thead><tr class="border-b-2 border-secondary-300"><th class="text-left py-2 px-3 font-semibold text-secondary-900">헤더</th><th class="text-left py-2 px-3 font-semibold text-secondary-900">설명</th><th class="text-left py-2 px-3 font-semibold text-secondary-900">필수 여부</th></tr></thead><tbody><tr class="border-b border-secondary-200"><td class="py-2 px-3 text-secondary-900"><code class="bg-secondary-100 px-2 py-1 rounded">Authorization</code></td><td class="py-2 px-3 text-secondary-700">API 키 또는 JWT를 담은 Bearer 토큰입니다.</td><td class="py-2 px-3 text-secondary-700">예</td></tr><tr><td class="py-2 px-3 text-secondary-900"><code class="bg-secondary-100 px-2 py-1 rounded">Content-Type</code></td><td class="py-2 px-3 text-secondary-700">요청 본문에는 <code class="bg-secondary-100 px-2 py-1 rounded">application/json</code> 을 사용합니다.</td><td class="py-2 px-3 text-secondary-700">POST/PUT</td></tr></tbody></table></section></div></div>`,
    ja: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">ドキュメント</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 text-sm font-medium">API リファレンス</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">認証</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">認証</h1><p class="text-lg text-secondary-600">API キーとセッショントークンで Local.LLM API リクエストを認証します。</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">概要</h2><ul class="space-y-3 text-secondary-700"><li><strong>API キー</strong>はサービス間通信や自動化に向いています。</li><li><strong>JWT トークン</strong>はユーザーセッションやブラウザアプリに向いています。</li></ul></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">API キー例</h2><p class="text-secondary-700 mb-4"><code class="bg-secondary-100 px-2 py-1 rounded">Authorization</code> ヘッダーにキーを入れて送信します。</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">curl -X GET http://localhost:3000/api/models \
  -H "Authorization: Bearer YOUR_API_KEY"</pre></div><div class="bg-blue-50 border border-blue-200 rounded-lg p-4"><p class="text-sm text-blue-900"><strong>Security:</strong> API キーはパスワードと同様に扱い、クライアント側バンドルに含めないでください。</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">JWT 例</h2><p class="text-secondary-700 mb-4">ログインフローを使ってユーザーセッション用トークンを取得します。</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "password": "secure-password"
  }'</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">ヘッダー</h2><table class="w-full border-collapse mt-4"><thead><tr class="border-b-2 border-secondary-300"><th class="text-left py-2 px-3 font-semibold text-secondary-900">ヘッダー</th><th class="text-left py-2 px-3 font-semibold text-secondary-900">説明</th><th class="text-left py-2 px-3 font-semibold text-secondary-900">必須</th></tr></thead><tbody><tr class="border-b border-secondary-200"><td class="py-2 px-3 text-secondary-900"><code class="bg-secondary-100 px-2 py-1 rounded">Authorization</code></td><td class="py-2 px-3 text-secondary-700">API キーまたは JWT を含む Bearer トークンです。</td><td class="py-2 px-3 text-secondary-700">はい</td></tr><tr><td class="py-2 px-3 text-secondary-900"><code class="bg-secondary-100 px-2 py-1 rounded">Content-Type</code></td><td class="py-2 px-3 text-secondary-700">リクエストボディには <code class="bg-secondary-100 px-2 py-1 rounded">application/json</code> を使います。</td><td class="py-2 px-3 text-secondary-700">POST/PUT</td></tr></tbody></table></section></div></div>`,
    ru: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Документация</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Справочник API</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Аутентификация</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Аутентификация</h1><p class="text-lg text-secondary-600">Аутентифицируйте запросы к API Local.LLM с помощью API-ключей и токенов сессии.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Обзор</h2><ul class="space-y-3 text-secondary-700"><li><strong>API-ключи</strong> лучше подходят для межсервисного взаимодействия и автоматизации.</li><li><strong>JWT-токены</strong> подходят для пользовательских сессий и браузерных приложений.</li></ul></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Пример с API-ключом</h2><p class="text-secondary-700 mb-4">Передайте ключ в заголовке <code class="bg-secondary-100 px-2 py-1 rounded">Authorization</code>.</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">curl -X GET http://localhost:3000/api/models \
  -H "Authorization: Bearer YOUR_API_KEY"</pre></div><div class="bg-blue-50 border border-blue-200 rounded-lg p-4"><p class="text-sm text-blue-900"><strong>Безопасность:</strong> относитесь к API-ключам как к паролям и не включайте их в клиентские сборки.</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Пример с JWT</h2><p class="text-secondary-700 mb-4">Используйте вход в систему, чтобы получить токен пользовательской сессии.</p><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "password": "secure-password"
  }'</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Заголовки</h2><table class="w-full border-collapse mt-4"><thead><tr class="border-b-2 border-secondary-300"><th class="text-left py-2 px-3 font-semibold text-secondary-900">Заголовок</th><th class="text-left py-2 px-3 font-semibold text-secondary-900">Описание</th><th class="text-left py-2 px-3 font-semibold text-secondary-900">Обязателен</th></tr></thead><tbody><tr class="border-b border-secondary-200"><td class="py-2 px-3 text-secondary-900"><code class="bg-secondary-100 px-2 py-1 rounded">Authorization</code></td><td class="py-2 px-3 text-secondary-700">Bearer-токен с API-ключом или JWT.</td><td class="py-2 px-3 text-secondary-700">Да</td></tr><tr><td class="py-2 px-3 text-secondary-900"><code class="bg-secondary-100 px-2 py-1 rounded">Content-Type</code></td><td class="py-2 px-3 text-secondary-700">Для тела запроса используйте <code class="bg-secondary-100 px-2 py-1 rounded">application/json</code>.</td><td class="py-2 px-3 text-secondary-700">Для POST/PUT</td></tr></tbody></table></section></div></div>`,
  },
  'api-applications': {
    en: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 text-sm font-medium">API Reference</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Applications</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Applications API</h1><p class="text-lg text-secondary-600">Discover, launch, and manage AI applications through the Local.LLM API.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">List Applications</h2><p class="text-secondary-700 mb-4">Fetch every application that is available to the current account.</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">GET /api/applications</p></div><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">curl -X GET http://localhost:3000/api/applications \
  -H "Authorization: Bearer YOUR_API_KEY"</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Get Details</h2><p class="text-secondary-700 mb-4">Retrieve metadata, capabilities, and limits for a single application.</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">GET /api/applications/:id</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Launch</h2><p class="text-secondary-700 mb-4">Start an application instance with model and runtime configuration.</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">POST /api/applications/:id/launch</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Status and Stop</h2><p class="text-secondary-700">Use <code class="bg-secondary-100 px-2 py-1 rounded">GET /api/applications/:id/status</code> to inspect a running instance and <code class="bg-secondary-100 px-2 py-1 rounded">POST /api/applications/:id/stop</code> to end it.</p></section></div></div>`,
    ko: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">문서</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 text-sm font-medium">API 레퍼런스</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">애플리케이션</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">애플리케이션 API</h1><p class="text-lg text-secondary-600">Local.LLM API를 통해 AI 애플리케이션을 조회, 실행, 관리하세요.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">애플리케이션 목록</h2><p class="text-secondary-700 mb-4">현재 계정에서 사용할 수 있는 모든 애플리케이션을 가져옵니다.</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">GET /api/applications</p></div><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">curl -X GET http://localhost:3000/api/applications \
  -H "Authorization: Bearer YOUR_API_KEY"</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">세부 정보</h2><p class="text-secondary-700 mb-4">단일 애플리케이션의 메타데이터, 기능, 제한 값을 확인합니다.</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">GET /api/applications/:id</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">실행</h2><p class="text-secondary-700 mb-4">모델 및 런타임 구성을 포함해 애플리케이션 인스턴스를 시작합니다.</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">POST /api/applications/:id/launch</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">상태 및 중지</h2><p class="text-secondary-700"><code class="bg-secondary-100 px-2 py-1 rounded">GET /api/applications/:id/status</code> 로 실행 중인 인스턴스를 확인하고 <code class="bg-secondary-100 px-2 py-1 rounded">POST /api/applications/:id/stop</code> 으로 종료합니다.</p></section></div></div>`,
    ja: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">ドキュメント</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 text-sm font-medium">API リファレンス</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">アプリケーション</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">アプリケーション API</h1><p class="text-lg text-secondary-600">Local.LLM API を通じて AI アプリケーションを確認、起動、管理します。</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">アプリ一覧</h2><p class="text-secondary-700 mb-4">現在のアカウントで利用可能なアプリケーションを取得します。</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">GET /api/applications</p></div><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">curl -X GET http://localhost:3000/api/applications \
  -H "Authorization: Bearer YOUR_API_KEY"</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">詳細取得</h2><p class="text-secondary-700 mb-4">単一アプリケーションのメタデータ、機能、制限値を取得します。</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">GET /api/applications/:id</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">起動</h2><p class="text-secondary-700 mb-4">モデル設定やランタイム構成を指定してアプリケーションインスタンスを起動します。</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">POST /api/applications/:id/launch</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">状態確認と停止</h2><p class="text-secondary-700"><code class="bg-secondary-100 px-2 py-1 rounded">GET /api/applications/:id/status</code> で状態を確認し、<code class="bg-secondary-100 px-2 py-1 rounded">POST /api/applications/:id/stop</code> で停止します。</p></section></div></div>`,
    ru: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Документация</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Справочник API</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Приложения</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">API приложений</h1><p class="text-lg text-secondary-600">Находите, запускайте и управляйте ИИ-приложениями через API Local.LLM.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Список приложений</h2><p class="text-secondary-700 mb-4">Получите все приложения, доступные текущей учётной записи.</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">GET /api/applications</p></div><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">curl -X GET http://localhost:3000/api/applications \
  -H "Authorization: Bearer YOUR_API_KEY"</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Получение деталей</h2><p class="text-secondary-700 mb-4">Верните метаданные, возможности и лимиты одного приложения.</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">GET /api/applications/:id</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Запуск</h2><p class="text-secondary-700 mb-4">Запускайте экземпляр приложения с конфигурацией модели и рантайма.</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">POST /api/applications/:id/launch</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Статус и остановка</h2><p class="text-secondary-700">Используйте <code class="bg-secondary-100 px-2 py-1 rounded">GET /api/applications/:id/status</code> для проверки экземпляра и <code class="bg-secondary-100 px-2 py-1 rounded">POST /api/applications/:id/stop</code> для его остановки.</p></section></div></div>`,
  },
  'api-models': {
    en: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Documentation</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 text-sm font-medium">API Reference</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Models</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">Models API</h1><p class="text-lg text-secondary-600">Query model metadata and run inference requests through the Local.LLM API.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">List Models</h2><p class="text-secondary-700 mb-4">Fetch every model available in the current environment.</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">GET /api/models</p></div><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">curl -X GET "http://localhost:3000/api/models?category=chat&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Get Model Details</h2><p class="text-secondary-700 mb-4">Return provider metadata, context windows, capabilities, and version information.</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">GET /api/models/:id</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Run Completion</h2><p class="text-secondary-700 mb-4">Send prompts to a model with parameters such as temperature, max tokens, and stop sequences.</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">POST /api/models/:id/complete</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Stream Responses</h2><p class="text-secondary-700">Use <code class="bg-secondary-100 px-2 py-1 rounded">POST /api/models/:id/complete-stream</code> to receive Server-Sent Events while tokens are generated.</p></section></div></div>`,
    ko: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">문서</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 text-sm font-medium">API 레퍼런스</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">모델</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">모델 API</h1><p class="text-lg text-secondary-600">Local.LLM API를 통해 모델 메타데이터를 조회하고 추론 요청을 실행합니다.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">모델 목록</h2><p class="text-secondary-700 mb-4">현재 환경에서 사용할 수 있는 모든 모델을 가져옵니다.</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">GET /api/models</p></div><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">curl -X GET "http://localhost:3000/api/models?category=chat&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">모델 상세</h2><p class="text-secondary-700 mb-4">제공자 정보, 컨텍스트 윈도우, 기능, 버전 정보를 반환합니다.</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">GET /api/models/:id</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">완성 요청</h2><p class="text-secondary-700 mb-4">temperature, max tokens, stop sequence 같은 파라미터와 함께 프롬프트를 보냅니다.</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">POST /api/models/:id/complete</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">스트리밍 응답</h2><p class="text-secondary-700"><code class="bg-secondary-100 px-2 py-1 rounded">POST /api/models/:id/complete-stream</code> 을 사용하면 토큰 생성 중 Server-Sent Events를 받을 수 있습니다.</p></section></div></div>`,
    ja: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">ドキュメント</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 text-sm font-medium">API リファレンス</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">モデル</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">モデル API</h1><p class="text-lg text-secondary-600">Local.LLM API を通じてモデル情報を照会し、推論リクエストを実行します。</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">モデル一覧</h2><p class="text-secondary-700 mb-4">現在の環境で利用可能なすべてのモデルを取得します。</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">GET /api/models</p></div><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">curl -X GET "http://localhost:3000/api/models?category=chat&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">モデル詳細</h2><p class="text-secondary-700 mb-4">プロバイダ情報、コンテキストウィンドウ、機能、バージョン情報を取得します。</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">GET /api/models/:id</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">補完実行</h2><p class="text-secondary-700 mb-4">temperature、max tokens、stop sequence などを指定してプロンプトを送信します。</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">POST /api/models/:id/complete</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">ストリーミング応答</h2><p class="text-secondary-700"><code class="bg-secondary-100 px-2 py-1 rounded">POST /api/models/:id/complete-stream</code> を使うと、トークン生成中に Server-Sent Events を受け取れます。</p></section></div></div>`,
    ru: raw`<div class="p-6 sm:p-8 lg:p-12 max-w-4xl"><div class="mb-6"><a href="/docs" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Документация</a><span class="text-secondary-400 mx-2">/</span><a href="/docs/api-reference" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Справочник API</a><span class="text-secondary-400 mx-2">/</span><span class="text-secondary-600 text-sm">Модели</span></div><div class="mb-8"><h1 class="text-4xl font-bold text-secondary-900 mb-4">API моделей</h1><p class="text-lg text-secondary-600">Запрашивайте метаданные моделей и выполняйте инференс через API Local.LLM.</p></div><div class="prose prose-lg max-w-none space-y-8"><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Список моделей</h2><p class="text-secondary-700 mb-4">Получите все модели, доступные в текущем окружении.</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">GET /api/models</p></div><div class="bg-black rounded-lg p-4 overflow-x-auto mb-4"><pre class="text-white text-sm font-mono">curl -X GET "http://localhost:3000/api/models?category=chat&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"</pre></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Детали модели</h2><p class="text-secondary-700 mb-4">Возвращает информацию о провайдере, размере контекста, возможностях и версии.</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">GET /api/models/:id</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Запуск completion</h2><p class="text-secondary-700 mb-4">Отправляйте промпт с параметрами, такими как temperature, max tokens и stop sequence.</p><div class="bg-secondary-50 rounded-lg p-4 mb-4"><p class="text-secondary-900 font-semibold">POST /api/models/:id/complete</p></div></section><section><h2 class="text-2xl font-bold text-secondary-900 mb-4">Потоковые ответы</h2><p class="text-secondary-700">Используйте <code class="bg-secondary-100 px-2 py-1 rounded">POST /api/models/:id/complete-stream</code>, чтобы получать Server-Sent Events во время генерации токенов.</p></section></div></div>`,
  },
};

export const docsPageIds = Object.keys(docsPageHtml) as DocsPageId[];

export function getDocsPageHtml(pageId: DocsPageId, languageCode: string): string {
  return docsPageHtml[pageId][languageCode as SupportedDocLanguage] ?? docsPageHtml[pageId].en;
}
