import { Injectable, signal, computed, inject, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface Language {
  code: string;
  label: string;
}

type TranslationDictionary = Record<string, Record<string, string>>;

const translations: TranslationDictionary = {
  // Hero component
  'hero.badge': {
    en: 'Unified AI Hub - Cloud or Self-Hosted',
    ko: '통합 AI 허브 - 클라우드 또는 자체 호스팅',
    ja: '統合AIハブ - クラウドまたはセルフホスト',
    ru: 'Единый ИИ-хаб — облако или собственный хостинг',
  },
  'hero.headline': {
    en: 'Tools For Everyone',
    ko: '모두를 위한 도구',
    ja: 'すべての人のためのツール',
    ru: 'Инструменты для всех',
  },
  'hero.subheading': {
    en: 'Local.LLM is your platform for accessing developer, roleplaying, and gaming AI applications. Use our cloud or host it yourself.',
    ko: 'Local.LLM은 개발자, 롤플레잉, 게임 AI 애플리케이션을 위한 플랫폼입니다. 클라우드를 사용하거나 직접 호스팅하세요.',
    ja: 'Local.LLMは、開発者向け、ロールプレイ向け、ゲーム向けのAIアプリケーションにアクセスするためのプラットフォームです。クラウドを利用することも、自分でホストすることもできます。',
    ru: 'Local.LLM — это платформа для доступа к ИИ-приложениям для разработчиков, ролевых игр и игр. Используйте наше облако или разместите её у себя.',
  },
  'hero.feature.cloud': {
    en: 'Cloud & Self-Hosted',
    ko: '클라우드 & 자체 호스팅',
    ja: 'クラウド & セルフホスト',
    ru: 'Облако и собственный хостинг',
  },
  'hero.feature.enterprise': {
    en: 'Enterprise Ready',
    ko: '엔터프라이즈 지원',
    ja: 'エンタープライズ対応',
    ru: 'Готово для бизнеса',
  },
  'hero.feature.opensource': {
    en: 'Open Source',
    ko: '오픈 소스',
    ja: 'オープンソース',
    ru: 'Открытый исходный код',
  },
  'hero.cta.dashboard': {
    en: 'Launch Dashboard',
    ko: '대시보드 실행',
    ja: 'ダッシュボードを開く',
    ru: 'Открыть панель',
  },
  'hero.cta.docs': {
    en: 'View Documentation',
    ko: '문서 보기',
    ja: 'ドキュメントを見る',
    ru: 'Открыть документацию',
  },
  'hero.cta.github': {
    en: 'View GitHub',
    ko: 'GitHub 보기',
    ja: 'GitHubを見る',
    ru: 'Открыть GitHub',
  },

  // Home page - Features section
  'home.features.title': {
    en: 'Powerful Features',
    ko: '강력한 기능',
    ja: '強力な機能',
    ru: 'Мощные возможности',
  },
  'home.features.subtitle': {
    en: 'Everything you need to run, manage, and scale local AI applications',
    ko: '로컬 AI 애플리케이션을 실행, 관리, 확장하는 데 필요한 모든 것',
    ja: 'ローカルAIアプリケーションの実行、管理、拡張に必要なすべて',
    ru: 'Всё необходимое для запуска, управления и масштабирования локальных ИИ-приложений',
  },
  'home.features.fast.title': {
    en: 'Lightning Fast',
    ko: '초고속',
    ja: '超高速',
    ru: 'Молниеносно быстро',
  },
  'home.features.fast.desc': {
    en: 'Cloud deployment with ultra-low latency, or self-host for local AI processing. Instant responses and complete control.',
    ko: '초저지연 클라우드 배포 또는 로컬 AI 처리를 위한 자체 호스팅. 즉각적인 응답과 완벽한 제어.',
    ja: '超低遅延のクラウドデプロイ、またはローカルAI処理のためのセルフホストに対応。即時の応答と完全な制御を実現します。',
    ru: 'Развёртывание в облаке с сверхнизкой задержкой или собственный хостинг для локальной обработки ИИ. Мгновенные ответы и полный контроль.',
  },
  'home.features.security.title': {
    en: 'Data Security',
    ko: '데이터 보안',
    ja: 'データセキュリティ',
    ru: 'Безопасность данных',
  },
  'home.features.security.desc': {
    en: 'Choose cloud hosting for convenience or self-host for complete data privacy. Your choice, your data, your control.',
    ko: '편의를 위해 클라우드 호스팅을 선택하거나 완전한 데이터 프라이버시를 위해 자체 호스팅하세요.',
    ja: '利便性のためにクラウドホスティングを選ぶことも、完全なデータプライバシーのためにセルフホストを選ぶこともできます。選ぶのはあなたです。',
    ru: 'Выберите облачный хостинг для удобства или собственный хостинг для полной конфиденциальности данных. Ваш выбор, ваши данные, ваш контроль.',
  },
  'home.features.opensource.title': {
    en: 'Open Source',
    ko: '오픈 소스',
    ja: 'オープンソース',
    ru: 'Открытый исходный код',
  },
  'home.features.opensource.desc': {
    en: 'Transparent, community-driven development. Deploy anywhere, extend, and customize for your needs.',
    ko: '투명하고 커뮤니티 중심의 개발. 어디서든 배포하고, 확장하고, 필요에 맞게 커스터마이징하세요.',
    ja: '透明でコミュニティ主導の開発。どこにでもデプロイでき、拡張やカスタマイズも自由です。',
    ru: 'Прозрачная разработка под управлением сообщества. Развёртывайте где угодно, расширяйте и настраивайте под свои задачи.',
  },
  'home.features.integration.title': {
    en: 'Easy Integration',
    ko: '쉬운 통합',
    ja: '簡単な統合',
    ru: 'Простая интеграция',
  },
  'home.features.integration.desc': {
    en: 'Simple APIs and web interface. Integrate AI into your workflow whether cloud or self-hosted.',
    ko: '간단한 API와 웹 인터페이스. 클라우드 또는 자체 호스팅으로 워크플로우에 AI를 통합하세요.',
    ja: 'シンプルなAPIとWebインターフェース。クラウドでもセルフホストでも、AIをワークフローに統合できます。',
    ru: 'Простые API и веб-интерфейс. Встраивайте ИИ в свой рабочий процесс как в облаке, так и на собственном хостинге.',
  },
  'home.features.monitor.title': {
    en: 'Performance Monitor',
    ko: '성능 모니터',
    ja: 'パフォーマンス監視',
    ru: 'Мониторинг производительности',
  },
  'home.features.monitor.desc': {
    en: 'Real-time metrics and insights into model performance and resource usage across all deployments.',
    ko: '모든 배포에서 모델 성능과 리소스 사용에 대한 실시간 메트릭과 인사이트.',
    ja: 'すべてのデプロイ環境におけるモデル性能とリソース使用量を、リアルタイムのメトリクスと洞察で把握できます。',
    ru: 'Метрики в реальном времени и аналитика по производительности моделей и использованию ресурсов во всех развёртываниях.',
  },
  'home.features.deployment.title': {
    en: 'Flexible Deployment',
    ko: '유연한 배포',
    ja: '柔軟なデプロイ',
    ru: 'Гибкое развёртывание',
  },
  'home.features.deployment.desc': {
    en: 'Deploy on our cloud infrastructure or host it yourself on your own servers. Full flexibility.',
    ko: '클라우드 인프라에 배포하거나 자체 서버에서 호스팅하세요. 완전한 유연성.',
    ja: '当社のクラウド基盤にデプロイすることも、自社サーバーでホストすることも可能です。完全な柔軟性を提供します。',
    ru: 'Развёртывайте в нашей облачной инфраструктуре или размещайте на собственных серверах. Полная гибкость.',
  },

  // Home page - CTA section
  'home.cta.title': {
    en: 'Ready to Get Started?',
    ko: '시작할 준비가 되셨나요?',
    ja: '始める準備はできましたか？',
    ru: 'Готовы начать?',
  },
  'home.cta.subtitle': {
    en: 'Access your dashboard and start running powerful AI applications on the cloud or self-hosted.',
    ko: '대시보드에 접속하여 클라우드 또는 자체 호스팅으로 강력한 AI 애플리케이션을 실행하세요.',
    ja: 'ダッシュボードにアクセスして、クラウドまたはセルフホスト環境で強力なAIアプリケーションを実行しましょう。',
    ru: 'Откройте панель управления и запускайте мощные ИИ-приложения в облаке или на собственном хостинге.',
  },
  'home.cta.button': {
    en: 'Launch Dashboard',
    ko: '대시보드 실행',
    ja: 'ダッシュボードを開く',
    ru: 'Открыть панель',
  },

  // Dashboard page
  'dashboard.badge': {
    en: 'Dashboard',
    ko: '대시보드',
    ja: 'ダッシュボード',
    ru: 'Панель управления',
  },
  'dashboard.title': {
    en: 'AI Applications Hub',
    ko: 'AI 애플리케이션 허브',
    ja: 'AIアプリケーションハブ',
    ru: 'Центр ИИ-приложений',
  },
  'dashboard.subtitle': {
    en: 'Access your suite of AI applications. Available on our cloud platform or self-hosted on your infrastructure.',
    ko: 'AI 애플리케이션 모음에 접근하세요. 클라우드 플랫폼 또는 자체 인프라에서 사용할 수 있습니다.',
    ja: 'AIアプリケーション群にアクセスしましょう。クラウドプラットフォームまたは自社インフラでご利用いただけます。',
    ru: 'Получите доступ к набору ИИ-приложений. Доступно в облаке или на вашей собственной инфраструктуре.',
  },
  'dashboard.settings': {
    en: 'Settings',
    ko: '설정',
    ja: '設定',
    ru: 'Настройки',
  },
  'dashboard.search': {
    en: 'Search applications...',
    ko: '애플리케이션 검색...',
    ja: 'アプリケーションを検索...',
    ru: 'Поиск приложений...',
  },
  'dashboard.filter.all': {
    en: 'All',
    ko: '전체',
    ja: 'すべて',
    ru: 'Все',
  },
  'dashboard.filter.tools': {
    en: 'Tools',
    ko: '도구',
    ja: 'ツール',
    ru: 'Инструменты',
  },
  'dashboard.filter.models': {
    en: 'Models',
    ko: '모델',
    ja: 'モデル',
    ru: 'Модели',
  },
  'dashboard.empty.title': {
    en: 'No applications found',
    ko: '애플리케이션을 찾을 수 없습니다',
    ja: 'アプリケーションが見つかりません',
    ru: 'Приложения не найдены',
  },
  'dashboard.empty.subtitle': {
    en: 'Try adjusting your search or filters',
    ko: '검색어나 필터를 조정해 보세요',
    ja: '検索条件やフィルターを変更してみてください',
    ru: 'Попробуйте изменить поиск или фильтры',
  },
  'dashboard.riskyAppsDisabled': {
    en: 'Risky apps are disabled by the administrator.',
    ko: '위험한 앱이 관리자에 의해 비활성화되었습니다.',
    ja: '危険なアプリは管理者によって無効化されています。',
    ru: 'Опасные приложения отключены администратором.',
  },

  // Web SEO App
  'webSeo.title': {
    en: 'Web Seo Optimizer',
    ko: '웹 SEO 최적화 도구',
    ja: 'ウェブSEOオプティマイザー',
    ru: 'Web Seo Оптимизатор',
  },
  'webSeo.subtitle': {
    en: 'Analyze your web projects for SEO, performance, and accessibility using AI.',
    ko: 'AI를 사용하여 웹 프로젝트의 SEO, 성능 및 접근성을 분석합니다.',
    ja: 'AIを使用して、ウェブプロジェクトのSEO、パフォーマンス、アクセシビリティを分析します。',
    ru: 'Анализируйте свои веб-проекты на предмет SEO, производительности и доступности с помощью ИИ.',
  },
  'webSeo.addApp': {
    en: 'Add SEO App',
    ko: 'SEO 앱 추가',
    ja: 'SEOアプリを追加',
    ru: 'Добавить SEO приложение',
  },
  'webSeo.noApps': {
    en: 'No SEO apps yet. Add one to start analyzing!',
    ko: '아직 SEO 앱이 없습니다. 분석을 시작하려면 하나를 추가하세요!',
    ja: 'SEOアプリはまだありません。分析を開始するには1つ追加してください！',
    ru: 'SEO-приложений пока нет. Добавьте одно, чтобы начать анализ!',
  },
  'webSeo.urlType': {
    en: 'Web URL',
    ko: '웹 URL',
    ja: 'ウェブURL',
    ru: 'Веб URL',
  },
  'webSeo.repoType': {
    en: 'Repository',
    ko: '저장소',
    ja: 'リポジトリ',
    ru: 'Репозиторий',
  },
  'webSeo.checkNow': {
    en: 'Run SEO Check',
    ko: 'SEO 확인 실행',
    ja: 'SEOチェックを実行',
    ru: 'Запустить проверку SEO',
  },
  'webSeo.lastChecked': {
    en: 'Last checked',
    ko: '마지막 확인',
    ja: '最終チェック',
    ru: 'Последняя проверка',
  },
  'webSeo.score': {
    en: 'Score',
    ko: '점수',
    ja: 'スコア',
    ru: 'Балл',
  },
  'webSeo.findings': {
    en: 'AI Findings',
    ko: 'AI 분석 결과',
    ja: 'AIの分析結果',
    ru: 'Результаты ИИ',
  },

  // App Card translations
  'apps.general-assistant.name': {
    en: 'Chat',
    ko: '채팅',
    ja: 'チャット',
    ru: 'Чат',
  },
  'apps.general-assistant.description': {
    en: 'A versatile AI assistant for conversations, questions, writing, coding, and more. Connect your preferred AI provider or use a local model.',
    ko: '대화, 질문, 글쓰기, 코딩 등을 위한 다재다능한 AI 어시스턴트입니다. 선호하는 AI 제공업체를 연결하거나 로컬 모델을 사용하세요.',
    ja: '会話、質問、執筆、コーディングなどのための多機能なAIアシスタントです。好みのAIプロバイダーを接続するか、ローカルモデルを使用してください。',
    ru: 'Универсальный ИИ-помощник для бесед, ответов на вопросы, написания текстов, программирования и многого другого. Подключите предпочитаемого провайдера ИИ или используйте локальную модель.',
  },
  'apps.coding-agent.name': {
    en: 'Coding Agent',
    ko: '코딩 에이전트',
    ja: 'コーディングエージェント',
    ru: 'Код-агент',
  },
  'apps.coding-agent.description': {
    en: 'An AI-powered coding agent that can write, execute, and iterate on code directly on the server. Enables autonomous software development tasks.',
    ko: '서버에서 직접 코드를 작성, 실행 및 반복할 수 있는 AI 기반 코딩 에이전트입니다. 자율적인 소프트웨어 개발 작업을 가능하게 합니다.',
    ja: 'サーバー上で直接コードを記述、実行、反復できるAI搭載コーディングエージェントです。自律的なソフトウェア開発タスクを可能にします。',
    ru: 'ИИ-агент для программирования, который может писать, выполнять и дорабатывать код прямо на сервере. Позволяет выполнять задачи автономной разработки ПО.',
  },
  'apps.repositories.name': {
    en: 'Repositories',
    ko: '저장소',
    ja: 'リポジトリ',
    ru: 'Репозитории',
  },
  'apps.repositories.description': {
    en: 'Manage Local.LLM repositories hosted on the server. Repositories auto-archive after 1 hour of inactivity, support git cloning via auth keys, and can be synced with GitHub.',
    ko: '서버에 호스팅된 Local.LLM 저장소를 관리합니다. 저장소는 1시간 동안 활동이 없으면 자동으로 보관되며, 인증 키를 통한 git 클로닝을 지원하고 GitHub와 동기화할 수 있습니다.',
    ja: 'サーバー上でホストされているLocal.LLMリポジトリを管理します。リポジトリは1時間の無活動後に自動的にアーカイブされ、認証キーによるgitクローンをサポートし、GitHubと同期できます。',
    ru: 'Управление репозиториями Local.LLM, размещенными на сервере. Репозитории автоматически архивируются после 1 часа бездействия, поддерживают клонирование git через ключи аутентификации и могут синхронизироваться with GitHub.',
  },
  'apps.web-seo.name': {
    en: 'Web Seo',
    ko: '웹 SEO',
    ja: 'ウェブSEO',
    ru: 'Веб SEO',
  },
  'apps.web-seo.description': {
    en: 'Analyze websites and repositories for SEO optimizations using AI. Automatically creates containers to build and check your web applications.',
    ko: 'AI를 사용하여 웹사이트 및 저장소의 SEO 최적화를 분석합니다. 웹 애플리케이션을 빌드하고 확인하기 위해 자동으로 컨테이너를 생성합니다.',
    ja: 'AIを使用してウェブサイトやリポジトリのSEO最適化を分析します。ウェブアプリケーションをビル드하여 확인하기 위해, 자동으로 컨테이너를 생성합니다.',
    ru: 'Анализ веб-сайтов и репозиториев на предмет SEO-оптимизации с помощью ИИ. Автоматически создает контейнеры для сборки и проверки ваших веб-приложений.',
  },
  'apps.roleplay.name': {
    en: 'Roleplay',
    ko: '롤플레잉',
    ja: 'ロールプレイ',
    ru: 'Ролевая игра',
  },
  'apps.roleplay.description': {
    en: 'Immerse yourself in different universes with custom and automatically generated characters. Experience a life-simulator with social media interactions.',
    ko: '커스텀 및 자동 생성된 캐릭터와 함께 다양한 세계관에 몰입해 보세요. 소셜 미디어 상호작용이 있는 라이프 시뮬레이터를 경험하세요.',
    ja: 'カスタムおよび自動生成されたキャラクターと共に、さまざまな世界観に没入しましょう。ソーシャルメディアでの交流があるライフシミュレーターを体験してください。',
    ru: 'Погрузитесь в различные вселенные с созданными и автоматически сгенерированными персонажами. Испытайте симулятор жизни с взаимодействием в социальных сетях.',
  },
  'apps.category.assistant': {
    en: 'Assistant',
    ko: '어시스턴트',
    ja: 'アシスタント',
    ru: 'Помощник',
  },
  'apps.category.agent': {
    en: 'Agent',
    ko: '에이전트',
    ja: 'エージェント',
    ru: 'Агент',
  },
  'apps.category.storage': {
    en: 'Storage',
    ko: '저장소',
    ja: 'ストレージ',
    ru: 'Хранилище',
  },
  'apps.category.seo': {
    en: 'SEO',
    ko: 'SEO',
    ja: 'SEO',
    ru: 'SEO',
  },
  'apps.datasets.name': {
    en: 'Datasets',
    ko: '데이터셋',
    ja: 'データセット',
    ru: 'Наборы данных',
  },
  'apps.datasets.description': {
    en: 'Create AI training datasets by providing instructions and selecting an LLM. Generate rows of data and download or save them to a Dataset repository.',
    ko: '지시사항을 제공하고 LLM을 선택하여 AI 학습 데이터셋을 생성합니다. 데이터 행을 생성하고 다운로드하거나 데이터셋 저장소에 저장하세요.',
    ja: '指示を入力しLLMを選択してAIトレーニングデータセットを作成します。データ行を生成し、ダウンロードまたはデータセットリポジトリに保存できます。',
    ru: 'Создавайте наборы данных для обучения ИИ, задавая инструкции и выбирая LLM. Генерируйте строки данных и загружайте или сохраняйте их в репозиторий наборов данных.',
  },
  'datasets.title': {
    en: '📊 Datasets',
    ko: '📊 데이터셋',
    ja: '📊 データセット',
    ru: '📊 Наборы данных',
  },
  'datasets.subtitle': {
    en: 'Create AI training datasets using any configured LLM provider',
    ko: '구성된 LLM 공급자를 사용하여 AI 학습 데이터셋을 생성하세요',
    ja: '設定済みのLLMプロバイダーを使用してAIトレーニングデータセットを作成します',
    ru: 'Создавайте наборы данных для обучения ИИ с помощью любого настроенного LLM-провайдера',
  },
  'datasets.back': {
    en: '← Back',
    ko: '← 뒤로',
    ja: '← 戻る',
    ru: '← Назад',
  },
  'datasets.instructions': {
    en: 'Instructions',
    ko: '지시사항',
    ja: '指示',
    ru: 'Инструкции',
  },
  'datasets.instructionsPlaceholder': {
    en: 'e.g. Create a dataset that makes the LLM think like a Claude Model',
    ko: '예: LLM이 Claude 모델처럼 생각하게 하는 데이터셋 만들기',
    ja: '例: LLMがClaudeモデルのように考えるデータセットを作成',
    ru: 'Например: Создайте набор данных, который заставит LLM думать как модель Claude',
  },
  'datasets.instructionsHint': {
    en: 'Describe the kind of data you want to generate. The LLM will create instruction/input/output rows based on this.',
    ko: '생성하려는 데이터의 종류를 설명하세요. LLM이 이를 기반으로 instruction/input/output 행을 생성합니다.',
    ja: '生成したいデータの種類を説明してください。LLMがこれに基づいてinstruction/input/output行を作成します。',
    ru: 'Опишите тип данных, которые хотите сгенерировать. LLM создаст строки instruction/input/output на основе этого.',
  },
  'datasets.providerLabel': {
    en: 'LLM Provider & Model',
    ko: 'LLM 공급자 및 모델',
    ja: 'LLMプロバイダーとモデル',
    ru: 'LLM-провайдер и модель',
  },
  'datasets.loadingProviders': {
    en: 'Loading providers…',
    ko: '공급자 로딩 중…',
    ja: 'プロバイダーを読み込み中…',
    ru: 'Загрузка провайдеров…',
  },
  'datasets.noProviders': {
    en: 'No AI providers configured.',
    ko: 'AI 공급자가 구성되지 않았습니다.',
    ja: 'AIプロバイダーが設定されていません。',
    ru: 'AI-провайдеры не настроены.',
  },
  'datasets.addProviderLink': {
    en: 'Add one in Settings →',
    ko: '설정에서 추가 →',
    ja: '設定で追加 →',
    ru: 'Добавить в настройках →',
  },
  'datasets.modelLabel': {
    en: 'Model',
    ko: '모델',
    ja: 'モデル',
    ru: 'Модель',
  },
  'datasets.numRowsLabel': {
    en: 'Number of Rows',
    ko: '행 수',
    ja: '行数',
    ru: 'Количество строк',
  },
  'datasets.numRowsHint': {
    en: 'Choose between 1 and 100,000 rows. Larger datasets take longer to generate.',
    ko: '1에서 100,000 사이의 행 수를 선택하세요. 큰 데이터셋은 생성 시간이 더 걸립니다.',
    ja: '1から100,000の間で行数を選択してください。大きなデータセットは生成に時間がかかります。',
    ru: 'Выберите от 1 до 100 000 строк. Более крупные наборы данных генерируются дольше.',
  },
  'datasets.numTokensLabel': {
    en: 'Number of Tokens',
    ko: '토큰 수',
    ja: 'トークン数',
    ru: 'Количество токенов',
  },
  'datasets.numTokensHint': {
    en: 'Specify the target number of tokens to generate. Larger values produce more data and take longer.',
    ko: '생성할 토큰 수를 지정하세요. 값이 클수록 더 많은 데이터가 생성되며 시간이 더 걸립니다.',
    ja: '生成するトークン数を指定してください。値が大きいほどデータが多くなり、時間がかかります。',
    ru: 'Укажите целевое количество токенов для генерации. Большие значения создают больше данных и занимают больше времени.',
  },
  'datasets.retryOnFailLabel': {
    en: 'Retry on fail',
    ko: '실패 시 재시도',
    ja: '失敗時にリトライ',
    ru: 'Повторить при ошибке',
  },
  'datasets.retryOnFailHint': {
    en: 'Automatically retry up to 3 times if the LLM fails or generates insufficient output.',
    ko: 'LLM이 실패하거나 출력이 부족한 경우 최대 3회 자동 재시도합니다.',
    ja: 'LLMが失敗するか出力が不十分な場合、最大3回自動的にリトライします。',
    ru: 'Автоматически повторять до 3 раз при сбое LLM или недостаточном объёме вывода.',
  },
  'datasets.individualGenerationLabel': {
    en: 'Generate rows individually',
    ko: '행 개별 생성',
    ja: '行を個別に生成',
    ru: 'Генерировать строки по отдельности',
  },
  'datasets.individualGenerationHint': {
    en: 'Each row is generated by a separate LLM call with no knowledge of previous rows. Produces more diverse results but takes longer.',
    ko: '각 행은 이전 행에 대한 지식 없이 별도의 LLM 호출로 생성됩니다. 더 다양한 결과를 생성하지만 시간이 더 오래 걸립니다.',
    ja: '各行は前の行の知識なしに個別のLLM呼び出しで生成されます。より多様な結果が得られますが、時間がかかります。',
    ru: 'Каждая строка генерируется отдельным вызовом LLM без знания предыдущих строк. Даёт более разнообразные результаты, но занимает больше времени.',
  },
  'datasets.generateButton': {
    en: 'Generate Dataset',
    ko: '데이터셋 생성',
    ja: 'データセット生成',
    ru: 'Сгенерировать набор данных',
  },
  'datasets.generating': {
    en: 'Generating dataset…',
    ko: '데이터셋 생성 중…',
    ja: 'データセット生成中…',
    ru: 'Генерация набора данных…',
  },
  'datasets.generatingHint': {
    en: 'This may take a moment depending on the number of tokens.',
    ko: '토큰 수에 따라 시간이 걸릴 수 있습니다.',
    ja: 'トークン数によって時間がかかる場合があります。',
    ru: 'Это может занять некоторое время в зависимости от количества токенов.',
  },
  'datasets.rowsCompleted': {
    en: 'rows completed',
    ko: '행 완료',
    ja: '行完了',
    ru: 'строк завершено',
  },
  'datasets.generationFailed': {
    en: 'Dataset Generation Failed',
    ko: '데이터셋 생성 실패',
    ja: 'データセット生成に失敗しました',
    ru: 'Ошибка генерации набора данных',
  },
  'datasets.noRowsGenerated': {
    en: 'No dataset rows were generated.',
    ko: '데이터셋 행이 생성되지 않았습니다.',
    ja: 'データセット行は生成されませんでした。',
    ru: 'Строки набора данных не были сгенерированы.',
  },
  'datasets.generated': {
    en: 'Dataset Generated',
    ko: '데이터셋 생성됨',
    ja: 'データセット生成完了',
    ru: 'Набор данных сгенерирован',
  },
  'datasets.noDatasetGenerated': {
    en: 'No Dataset Generated',
    ko: '데이터셋 생성 안됨',
    ja: 'データセット未生成',
    ru: 'Набор данных не сгенерирован',
  },
  'datasets.emptyGeneration': {
    en: 'Generation completed without creating any rows.',
    ko: '행을 생성하지 않고 완료되었습니다.',
    ja: '行を作成せずに生成が完了しました。',
    ru: 'Генерация завершена без создания строк.',
  },
  'datasets.newDataset': {
    en: '← New Dataset',
    ko: '← 새 데이터셋',
    ja: '← 新しいデータセット',
    ru: '← Новый набор данных',
  },
  'datasets.saveOrDownload': {
    en: 'Save or Download',
    ko: '저장 또는 다운로드',
    ja: '保存またはダウンロード',
    ru: 'Сохранить или скачать',
  },
  'datasets.downloadJsonl': {
    en: 'Download as JSONL',
    ko: 'JSONL로 다운로드',
    ja: 'JSONLとしてダウンロード',
    ru: 'Скачать как JSONL',
  },
  'datasets.saveToRepo': {
    en: 'Save to Dataset Repository',
    ko: '데이터셋 저장소에 저장',
    ja: 'データセットリポジトリに保存',
    ru: 'Сохранить в репозиторий',
  },
  'datasets.saveDataset': {
    en: 'Save Dataset',
    ko: '데이터셋 저장',
    ja: 'データセットを保存',
    ru: 'Сохранить набор данных',
  },
  'datasets.datasetNamePlaceholder': {
    en: 'Dataset name',
    ko: '데이터셋 이름',
    ja: 'データセット名',
    ru: 'Название набора данных',
  },
  'datasets.repoNamePlaceholder': {
    en: 'Dataset repository name',
    ko: '데이터셋 저장소 이름',
    ja: 'データセットリポジトリ名',
    ru: 'Название репозитория',
  },
  'datasets.descriptionPlaceholder': {
    en: 'Description (optional)',
    ko: '설명 (선택사항)',
    ja: '説明（任意）',
    ru: 'Описание (необязательно)',
  },
  'datasets.saving': {
    en: 'Saving…',
    ko: '저장 중…',
    ja: '保存中…',
    ru: 'Сохранение…',
  },
  'datasets.save': {
    en: 'Save',
    ko: '저장',
    ja: '保存',
    ru: 'Сохранить',
  },
  'datasets.cancel': {
    en: 'Cancel',
    ko: '취소',
    ja: 'キャンセル',
    ru: 'Отмена',
  },
  'datasets.savedSuccess': {
    en: '✅ Dataset "{name}" saved successfully!',
    ko: '✅ 데이터셋 "{name}"이(가) 성공적으로 저장되었습니다!',
    ja: '✅ データセット「{name}」が正常に保存されました！',
    ru: '✅ Набор данных «{name}» успешно сохранён!',
  },
  'datasets.saveError': {
    en: 'Failed to save dataset',
    ko: '데이터셋 저장 실패',
    ja: 'データセットの保存に失敗しました',
    ru: 'Не удалось сохранить набор данных',
  },
  'datasets.tableInstruction': {
    en: 'Instruction',
    ko: '지시',
    ja: '指示',
    ru: 'Инструкция',
  },
  'datasets.tableInput': {
    en: 'Input',
    ko: '입력',
    ja: '入力',
    ru: 'Ввод',
  },
  'datasets.tableOutput': {
    en: 'Output',
    ko: '출력',
    ja: '出力',
    ru: 'Вывод',
  },
  'datasets.storageUsed': {
    en: 'Dataset storage used',
    ko: '데이터셋 저장공간 사용량',
    ja: 'データセットストレージ使用量',
    ru: 'Использовано хранилище данных',
  },
  'datasets.loadingDatasets': {
    en: 'Loading datasets…',
    ko: '데이터셋 로딩 중…',
    ja: 'データセットを読み込み中…',
    ru: 'Загрузка наборов данных…',
  },
  'datasets.noDatasets': {
    en: 'No datasets yet',
    ko: '데이터셋이 없습니다',
    ja: 'データセットはまだありません',
    ru: 'Пока нет наборов данных',
  },
  'datasets.noDatasetsHint': {
    en: 'Create your first dataset by generating with AI or importing from HuggingFace.',
    ko: 'AI로 생성하거나 HuggingFace에서 가져와서 첫 번째 데이터셋을 만드세요.',
    ja: 'AIで生成するかHuggingFaceからインポートして最初のデータセットを作成しましょう。',
    ru: 'Создайте первый набор данных, сгенерировав с помощью ИИ или импортировав из HuggingFace.',
  },
  'datasets.filterAll': {
    en: 'All',
    ko: '전체',
    ja: 'すべて',
    ru: 'Все',
  },
  'datasets.filterActive': {
    en: 'Active',
    ko: '활성',
    ja: 'アクティブ',
    ru: 'Активные',
  },
  'datasets.filterArchived': {
    en: 'Archived',
    ko: '보관됨',
    ja: 'アーカイブ済み',
    ru: 'Архивные',
  },
  'datasets.statusActive': {
    en: 'Active',
    ko: '활성',
    ja: 'アクティブ',
    ru: 'Активный',
  },
  'datasets.statusArchived': {
    en: 'Archived',
    ko: '보관됨',
    ja: 'アーカイブ済み',
    ru: 'В архиве',
  },
  'datasets.rows': {
    en: 'rows',
    ko: '행',
    ja: '行',
    ru: 'строк',
  },
  'datasets.tokens': {
    en: 'tokens',
    ko: '토큰',
    ja: 'トークン',
    ru: 'токенов',
  },
  'datasets.archive': {
    en: 'Archive',
    ko: '보관',
    ja: 'アーカイブ',
    ru: 'Архивировать',
  },
  'datasets.unarchive': {
    en: 'Unarchive',
    ko: '보관 해제',
    ja: 'アーカイブ解除',
    ru: 'Разархивировать',
  },
  'datasets.delete': {
    en: 'Delete',
    ko: '삭제',
    ja: '削除',
    ru: 'Удалить',
  },
  'datasets.confirmDeleteTitle': {
    en: 'Delete Dataset',
    ko: '데이터셋 삭제',
    ja: 'データセットの削除',
    ru: 'Удалить набор данных',
  },
  'datasets.confirmDeleteMessage': {
    en: 'Are you sure you want to delete "{name}"? This action cannot be undone.',
    ko: '"{name}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    ja: '「{name}」を削除してもよろしいですか？この操作は元に戻せません。',
    ru: 'Вы уверены, что хотите удалить «{name}»? Это действие нельзя отменить.',
  },
  'datasets.backToList': {
    en: 'Back to datasets',
    ko: '데이터셋 목록으로',
    ja: 'データセット一覧に戻る',
    ru: 'К списку наборов данных',
  },
  'datasets.datasetNameLabel': {
    en: 'Dataset Name',
    ko: '데이터셋 이름',
    ja: 'データセット名',
    ru: 'Название набора данных',
  },
  'datasets.datasetNameHint': {
    en: 'Name for the local dataset. If empty, the HuggingFace dataset name will be used.',
    ko: '로컬 데이터셋의 이름입니다. 비어 있으면 HuggingFace 데이터셋 이름이 사용됩니다.',
    ja: 'ローカルデータセットの名前。空の場合、HuggingFaceデータセット名が使用されます。',
    ru: 'Имя для локального набора данных. Если пусто, будет использовано имя из HuggingFace.',
  },
  'datasets.queueTab': {
    en: 'Queue',
    ko: '대기열',
    ja: 'キュー',
    ru: 'Очередь',
  },
  'datasets.queueTitle': {
    en: 'Dataset Queue',
    ko: '데이터셋 대기열',
    ja: 'データセットキュー',
    ru: 'Очередь наборов данных',
  },
  'datasets.queueSubtitle': {
    en: 'Queue multiple dataset generations to run one after another, automatically saving to storage.',
    ko: '여러 데이터셋 생성을 대기열에 추가하여 순차적으로 실행하고 자동으로 저장합니다.',
    ja: '複数のデータセット生成をキューに追加し、順次実行して自動保存します。',
    ru: 'Добавьте несколько генераций наборов данных в очередь для последовательного выполнения с автоматическим сохранением.',
  },
  'datasets.queueEmpty': {
    en: 'Queue is empty',
    ko: '대기열이 비어 있습니다',
    ja: 'キューは空です',
    ru: 'Очередь пуста',
  },
  'datasets.queueEmptyHint': {
    en: 'Add generation jobs to the queue using the form above.',
    ko: '위의 양식을 사용하여 생성 작업을 대기열에 추가하세요.',
    ja: '上のフォームを使用して生成ジョブをキューに追加してください。',
    ru: 'Добавьте задания на генерацию в очередь, используя форму выше.',
  },
  'datasets.addToQueue': {
    en: 'Add to Queue',
    ko: '대기열에 추가',
    ja: 'キューに追加',
    ru: 'Добавить в очередь',
  },
  'datasets.startQueue': {
    en: 'Start Queue',
    ko: '대기열 시작',
    ja: 'キュー開始',
    ru: 'Запустить очередь',
  },
  'datasets.stopQueue': {
    en: 'Stop Queue',
    ko: '대기열 중지',
    ja: 'キュー停止',
    ru: 'Остановить очередь',
  },
  'datasets.clearQueue': {
    en: 'Clear Queue',
    ko: '대기열 비우기',
    ja: 'キューをクリア',
    ru: 'Очистить очередь',
  },
  'datasets.queueItemPending': {
    en: 'Pending',
    ko: '대기 중',
    ja: '保留中',
    ru: 'Ожидание',
  },
  'datasets.queueItemGenerating': {
    en: 'Generating…',
    ko: '생성 중…',
    ja: '生成中…',
    ru: 'Генерация…',
  },
  'datasets.queueItemSaving': {
    en: 'Saving…',
    ko: '저장 중…',
    ja: '保存中…',
    ru: 'Сохранение…',
  },
  'datasets.queueItemDone': {
    en: 'Done',
    ko: '완료',
    ja: '完了',
    ru: 'Готово',
  },
  'datasets.queueItemFailed': {
    en: 'Failed',
    ko: '실패',
    ja: '失敗',
    ru: 'Ошибка',
  },
  'datasets.queueProgress': {
    en: '{completed} of {total} completed',
    ko: '{total}개 중 {completed}개 완료',
    ja: '{total}件中{completed}件完了',
    ru: '{completed} из {total} завершено',
  },
  'datasets.queueJobName': {
    en: 'Dataset Name',
    ko: '데이터셋 이름',
    ja: 'データセット名',
    ru: 'Название набора данных',
  },
  'datasets.queueJobNamePlaceholder': {
    en: 'e.g. math-qa-dataset',
    ko: '예: math-qa-dataset',
    ja: '例: math-qa-dataset',
    ru: 'например: math-qa-dataset',
  },
  'datasets.removeFromQueue': {
    en: 'Remove',
    ko: '제거',
    ja: '削除',
    ru: 'Удалить',
  },
  'datasets.queueAllDone': {
    en: 'All queue items completed!',
    ko: '모든 대기열 항목이 완료되었습니다!',
    ja: 'すべてのキュー項目が完了しました！',
    ru: 'Все элементы очереди выполнены!',
  },
  'datasets.queueRunning': {
    en: 'Queue is running…',
    ko: '대기열 실행 중…',
    ja: 'キュー実行中…',
    ru: 'Очередь выполняется…',
  },
  'datasets.refine': {
    en: 'Refine',
    ko: '정제',
    ja: '精錬',
    ru: 'Уточнить',
  },
  'datasets.refineTab': {
    en: 'Refine Dataset',
    ko: '데이터셋 정제',
    ja: 'データセット精錬',
    ru: 'Уточнить набор данных',
  },
  'datasets.refineTitle': {
    en: 'Refine Dataset',
    ko: '데이터셋 정제',
    ja: 'データセット精錬',
    ru: 'Уточнить набор данных',
  },
  'datasets.refineSubtitle': {
    en: 'Improve an existing dataset by processing each row through an LLM to fix grammar, punctuation, and quality issues.',
    ko: 'LLM을 통해 각 행을 처리하여 문법, 구두점 및 품질 문제를 수정하여 기존 데이터셋을 개선합니다.',
    ja: 'LLMで各行を処理して文法、句読点、品質の問題を修正し、既存のデータセットを改善します。',
    ru: 'Улучшите существующий набор данных, обработав каждую строку через LLM для исправления грамматики, пунктуации и проблем качества.',
  },
  'datasets.refineSelectDataset': {
    en: 'Dataset to Refine',
    ko: '정제할 데이터셋',
    ja: '精錬するデータセット',
    ru: 'Набор данных для уточнения',
  },
  'datasets.refineNoDatasets': {
    en: 'No active datasets available to refine. Create or import a dataset first.',
    ko: '정제할 활성 데이터셋이 없습니다. 먼저 데이터셋을 생성하거나 가져오세요.',
    ja: '精錬可能なアクティブなデータセットがありません。まずデータセットを作成またはインポートしてください。',
    ru: 'Нет активных наборов данных для уточнения. Сначала создайте или импортируйте набор данных.',
  },
  'datasets.refineSelectPlaceholder': {
    en: 'Select a dataset…',
    ko: '데이터셋 선택…',
    ja: 'データセットを選択…',
    ru: 'Выберите набор данных…',
  },
  'datasets.refineInstructions': {
    en: 'Refinement Instructions (optional)',
    ko: '정제 지침 (선택 사항)',
    ja: '精錬指示（任意）',
    ru: 'Инструкции по уточнению (необязательно)',
  },
  'datasets.refineInstructionsPlaceholder': {
    en: 'e.g. Ensure all outputs use formal language, fix any factual errors about geography…',
    ko: '예: 모든 출력에 격식체 사용, 지리에 대한 사실 오류 수정…',
    ja: '例: すべての出力でフォーマルな言語を使用、地理に関する事実の誤りを修正…',
    ru: 'например: Убедитесь, что все ответы используют формальный язык, исправьте фактические ошибки о географии…',
  },
  'datasets.refineInstructionsHint': {
    en: 'Additional instructions for the LLM beyond default grammar and quality fixes.',
    ko: '기본 문법 및 품질 수정 외에 LLM에 대한 추가 지침입니다.',
    ja: 'デフォルトの文法・品質修正以外のLLMへの追加指示です。',
    ru: 'Дополнительные инструкции для LLM помимо стандартных исправлений грамматики и качества.',
  },
  'datasets.refineSaveName': {
    en: 'Save Refined Dataset As',
    ko: '정제된 데이터셋 저장 이름',
    ja: '精錬データセットの保存名',
    ru: 'Сохранить уточнённый набор данных как',
  },
  'datasets.refineSaveNamePlaceholder': {
    en: 'e.g. my-dataset-refined',
    ko: '예: my-dataset-refined',
    ja: '例: my-dataset-refined',
    ru: 'например: my-dataset-refined',
  },
  'datasets.refineSaveNameHint': {
    en: 'The refined dataset will be saved as a new dataset with this name.',
    ko: '정제된 데이터셋은 이 이름으로 새 데이터셋으로 저장됩니다.',
    ja: '精錬されたデータセットはこの名前で新しいデータセットとして保存されます。',
    ru: 'Уточнённый набор данных будет сохранён как новый набор данных с этим именем.',
  },
  'datasets.addRefineToQueue': {
    en: 'Add Refinement to Queue',
    ko: '정제를 대기열에 추가',
    ja: '精錬をキューに追加',
    ru: 'Добавить уточнение в очередь',
  },
  'datasets.queueItemRefining': {
    en: 'Refining…',
    ko: '정제 중…',
    ja: '精錬中…',
    ru: 'Уточнение…',
  },
  'datasets.refineDefaultDescription': {
    en: 'Fix grammar, punctuation, and quality issues',
    ko: '문법, 구두점 및 품질 문제 수정',
    ja: '文法、句読点、品質の問題を修正',
    ru: 'Исправление грамматики, пунктуации и проблем качества',
  },
  'datasets.view': {
    en: 'View',
    ko: '보기',
    ja: '表示',
    ru: 'Просмотр',
  },
  'datasets.edit': {
    en: 'Edit',
    ko: '편집',
    ja: '編集',
    ru: 'Редактировать',
  },
  'datasets.viewTitle': {
    en: 'Dataset: {name}',
    ko: '데이터셋: {name}',
    ja: 'データセット: {name}',
    ru: 'Датасет: {name}',
  },
  'datasets.loadingRows': {
    en: 'Loading dataset rows…',
    ko: '데이터셋 행 로딩 중…',
    ja: 'データセット行を読み込み中…',
    ru: 'Загрузка строк датасета…',
  },
  'datasets.noRows': {
    en: 'This dataset has no rows.',
    ko: '이 데이터셋에는 행이 없습니다.',
    ja: 'このデータセットには行がありません。',
    ru: 'В этом датасете нет строк.',
  },
  'datasets.addRow': {
    en: 'Add Row',
    ko: '행 추가',
    ja: '行を追加',
    ru: 'Добавить строку',
  },
  'datasets.deleteRow': {
    en: 'Delete',
    ko: '삭제',
    ja: '削除',
    ru: 'Удалить',
  },
  'datasets.saveChanges': {
    en: 'Save Changes',
    ko: '변경 사항 저장',
    ja: '変更を保存',
    ru: 'Сохранить изменения',
  },
  'datasets.savingChanges': {
    en: 'Saving…',
    ko: '저장 중…',
    ja: '保存中…',
    ru: 'Сохранение…',
  },
  'datasets.changesSaved': {
    en: 'Changes saved successfully',
    ko: '변경 사항이 저장되었습니다',
    ja: '変更が保存されました',
    ru: 'Изменения сохранены',
  },
  'datasets.unsavedChanges': {
    en: 'You have unsaved changes.',
    ko: '저장되지 않은 변경 사항이 있습니다.',
    ja: '未保存の変更があります。',
    ru: 'У вас есть несохранённые изменения.',
  },
  'datasets.discardChanges': {
    en: 'Discard',
    ko: '취소',
    ja: '破棄',
    ru: 'Отменить',
  },
  'datasets.rowCount': {
    en: '{count} rows',
    ko: '{count}행',
    ja: '{count}行',
    ru: '{count} строк',
  },
  'datasets.datasetTypeLabel': {
    en: 'Dataset Type',
    ko: '데이터셋 유형',
    ja: 'データセットタイプ',
    ru: 'Тип набора данных',
  },
  'datasets.typeStandard': {
    en: 'Training Dataset',
    ko: '학습 데이터셋',
    ja: 'トレーニングデータセット',
    ru: 'Обучающий набор',
  },
  'datasets.typeStandardDesc': {
    en: 'Instruction, Input, Output format for main training',
    ko: '주요 학습을 위한 지시, 입력, 출력 형식',
    ja: 'メイントレーニング用の指示・入力・出力形式',
    ru: 'Формат инструкция/ввод/вывод для основного обучения',
  },
  'datasets.typePostTraining': {
    en: 'Post-Training',
    ko: '사후학습',
    ja: 'ポストトレーニング',
    ru: 'Пост-обучение',
  },
  'datasets.typePostTrainingDesc': {
    en: 'Prompt, Chosen, Rejected format for preference learning',
    ko: '선호도 학습을 위한 프롬프트, 선택, 거부 형식',
    ja: '選好学習用のプロンプト・選択・拒否形式',
    ru: 'Формат запрос/выбранный/отклонённый для обучения предпочтениям',
  },
  'datasets.tablePrompt': {
    en: 'Prompt',
    ko: '프롬프트',
    ja: 'プロンプト',
    ru: 'Запрос',
  },
  'datasets.tableChosen': {
    en: 'Chosen',
    ko: '선택',
    ja: '選択',
    ru: 'Выбранный',
  },
  'datasets.tableRejected': {
    en: 'Rejected',
    ko: '거부',
    ja: '拒否',
    ru: 'Отклонённый',
  },
  'apps.category.data': {
    en: 'Data',
    ko: '데이터',
    ja: 'データ',
    ru: 'Данные',
  },
  'apps.category.creative': {
    en: 'Creative',
    ko: '크리에이티브',
    ja: 'クリエイティブ',
    ru: 'Творчество',
  },
  'apps.category.training': {
    en: 'Training',
    ko: '훈련',
    ja: 'トレーニング',
    ru: 'Обучение',
  },
  'apps.train-llm.name': {
    en: 'Train LLM',
    ko: 'LLM 훈련',
    ja: 'LLMトレーニング',
    ru: 'Обучение LLM',
  },
  'apps.train-llm.description': {
    en: 'Fine-tune local language models on your datasets. Create training jobs, select base models and datasets, monitor progress in real-time.',
    ko: '데이터셋으로 로컬 언어 모델을 미세 조정합니다. 훈련 작업을 생성하고 기본 모델과 데이터셋을 선택하며 실시간으로 진행 상황을 모니터링합니다.',
    ja: 'データセットでローカル言語モデルをファインチューニングします。トレーニングジョブを作成し、ベースモデルとデータセットを選択し、進行状況をリアルタイムで監視します。',
    ru: 'Дообучайте локальные языковые модели на своих наборах данных. Создавайте задачи обучения, выбирайте базовые модели и наборы данных, отслеживайте прогресс в реальном времени.',
  },
  'apps.local-fix.name': {
    en: 'Local Fix',
    ko: '로컬 수리',
    ja: 'ローカル修復',
    ru: 'Локальный ремонт',
  },
  'apps.local-fix.description': {
    en: 'Run an LLM agent locally to diagnose and optionally fix issues on a remote computer. Connects via setup scripts with command approval and full session logging.',
    ko: '원격 컴퓨터의 문제를 진단하고 선택적으로 수정하기 위해 LLM 에이전트를 로컬에서 실행합니다. 명령 승인 및 전체 세션 로깅과 함께 설정 스크립트를 통해 연결합니다.',
    ja: 'リモートコンピュータの問題を診断し、オプションで修正するためにLLMエージェントをローカルで実行します。コマンド承認と完全なセッションログを使用してセットアップスクリプトで接続します。',
    ru: 'Запускайте LLM-агента локально для диагностики и, при необходимости, исправления проблем на удалённом компьютере. Подключение через скрипты настройки с подтверждением команд и полным журналом сессии.',
  },
  'apps.category.diagnostic': {
    en: 'Diagnostic',
    ko: '진단',
    ja: '診断',
    ru: 'Диагностика',
  },
  'localFix.title': {
    en: '🔧 Local Fix',
    ko: '🔧 로컬 수리',
    ja: '🔧 ローカル修復',
    ru: '🔧 Локальный ремонт',
  },
  'localFix.back': {
    en: 'Back',
    ko: '뒤로',
    ja: '戻る',
    ru: 'Назад',
  },
  'localFix.setup.description': {
    en: 'Use Local Fix to run an LLM agent that diagnoses and optionally fixes issues on a target computer.',
    ko: 'Local Fix를 사용하여 대상 컴퓨터의 문제를 진단하고 선택적으로 수정하는 LLM 에이전트를 실행합니다.',
    ja: 'Local Fixを使用して、対象コンピュータの問題を診断し、オプションで修正するLLMエージェントを実行します。',
    ru: 'Используйте Local Fix для запуска LLM-агента, который диагностирует и, при необходимости, исправляет проблемы на целевом компьютере.',
  },
  'localFix.setup.instructions': {
    en: 'How it works:',
    ko: '작동 방식:',
    ja: '仕組み:',
    ru: 'Как это работает:',
  },
  'localFix.setup.step1': {
    en: 'Enter the URL of your Local.LLM instance and your user ID',
    ko: 'Local.LLM 인스턴스의 URL과 사용자 ID를 입력합니다',
    ja: 'Local.LLMインスタンスのURLとユーザーIDを入力します',
    ru: 'Введите URL вашего экземпляра Local.LLM и ваш ID пользователя',
  },
  'localFix.setup.step2': {
    en: 'Describe the issue and choose whether to allow command execution',
    ko: '문제를 설명하고 명령 실행 허용 여부를 선택합니다',
    ja: '問題を説明し、コマンド実行を許可するかどうかを選択します',
    ru: 'Опишите проблему и выберите, разрешить ли выполнение команд',
  },
  'localFix.setup.step3': {
    en: 'Run the generated setup script on the target computer and interact via the web session',
    ko: '대상 컴퓨터에서 생성된 설정 스크립트를 실행하고 웹 세션을 통해 상호 작용합니다',
    ja: '対象コンピュータで生成されたセットアップスクリプトを実行し、Webセッションで操作します',
    ru: 'Запустите сгенерированный скрипт настройки на целевом компьютере и взаимодействуйте через веб-сессию',
  },
  'localFix.setup.continue': {
    en: 'Get Started',
    ko: '시작하기',
    ja: '始める',
    ru: 'Начать',
  },
  'localFix.configure.title': {
    en: 'Configure Connection',
    ko: '연결 설정',
    ja: '接続設定',
    ru: 'Настройка подключения',
  },
  'localFix.configure.instanceUrl': {
    en: 'Local.LLM Instance URL',
    ko: 'Local.LLM 인스턴스 URL',
    ja: 'Local.LLMインスタンスURL',
    ru: 'URL экземпляра Local.LLM',
  },
  'localFix.configure.instanceUrlHint': {
    en: 'The URL of your Local.LLM server (e.g., http://localhost:3000)',
    ko: 'Local.LLM 서버의 URL (예: http://localhost:3000)',
    ja: 'Local.LLMサーバーのURL（例：http://localhost:3000）',
    ru: 'URL вашего сервера Local.LLM (например, http://localhost:3000)',
  },
  'localFix.configure.userId': {
    en: 'User ID',
    ko: '사용자 ID',
    ja: 'ユーザーID',
    ru: 'ID пользователя',
  },
  'localFix.configure.userIdHint': {
    en: 'Your Local.LLM user ID to associate this session with your account',
    ko: '이 세션을 계정에 연결하기 위한 Local.LLM 사용자 ID',
    ja: 'このセッションをアカウントに関連付けるためのLocal.LLMユーザーID',
    ru: 'Ваш ID пользователя Local.LLM для привязки этой сессии к вашему аккаунту',
  },
  'localFix.configure.next': {
    en: 'Next',
    ko: '다음',
    ja: '次へ',
    ru: 'Далее',
  },
  'localFix.issue.title': {
    en: 'Describe the Issue',
    ko: '문제 설명',
    ja: '問題の説明',
    ru: 'Опишите проблему',
  },
  'localFix.issue.description': {
    en: 'What issue are you experiencing?',
    ko: '어떤 문제를 겪고 있나요?',
    ja: 'どのような問題が発生していますか？',
    ru: 'Какая проблема у вас возникла?',
  },
  'localFix.issue.allowCommands': {
    en: 'Allow the LLM to suggest and run commands (with your approval)',
    ko: 'LLM이 명령을 제안하고 실행할 수 있도록 허용 (사용자 승인 필요)',
    ja: 'LLMにコマンドの提案と実行を許可する（承認が必要）',
    ru: 'Разрешить LLM предлагать и выполнять команды (с вашим одобрением)',
  },
  'localFix.issue.commandWarningTitle': {
    en: 'Command Execution',
    ko: '명령 실행',
    ja: 'コマンド実行',
    ru: 'Выполнение команд',
  },
  'localFix.issue.commandWarning': {
    en: 'Commands will only run after you explicitly approve them. All commands and their outputs will be logged.',
    ko: '명령은 명시적으로 승인한 후에만 실행됩니다. 모든 명령과 출력이 기록됩니다.',
    ja: 'コマンドは明示的に承認した後にのみ実行されます。すべてのコマンドとその出力が記録されます。',
    ru: 'Команды будут выполняться только после вашего явного одобрения. Все команды и их результаты будут записаны.',
  },
  'localFix.issue.start': {
    en: 'Start Diagnostic Session',
    ko: '진단 세션 시작',
    ja: '診断セッションを開始',
    ru: 'Начать диагностическую сессию',
  },
  'localFix.issue.starting': {
    en: 'Starting...',
    ko: '시작 중...',
    ja: '開始中...',
    ru: 'Запуск...',
  },
  'localFix.session.title': {
    en: 'Local Fix Session',
    ko: 'Local Fix 세션',
    ja: 'Local Fixセッション',
    ru: 'Сессия Local Fix',
  },
  'localFix.session.end': {
    en: 'End Session',
    ko: '세션 종료',
    ja: 'セッション終了',
    ru: 'Завершить сессию',
  },
  'localFix.session.noLogs': {
    en: 'No activity yet',
    ko: '아직 활동 없음',
    ja: 'まだアクティビティはありません',
    ru: 'Пока нет активности',
  },
  'localFix.session.noLogsHint': {
    en: 'Send a message to start the diagnostic',
    ko: '진단을 시작하려면 메시지를 보내세요',
    ja: '診断を開始するにはメッセージを送信してください',
    ru: 'Отправьте сообщение для начала диагностики',
  },
  'localFix.session.pendingCommands': {
    en: 'Pending Commands (approval required)',
    ko: '대기 중인 명령 (승인 필요)',
    ja: '保留中のコマンド（承認が必要）',
    ru: 'Ожидающие команды (требуется одобрение)',
  },
  'localFix.session.approve': {
    en: 'Approve',
    ko: '승인',
    ja: '承認',
    ru: 'Одобрить',
  },
  'localFix.session.reject': {
    en: 'Reject',
    ko: '거부',
    ja: '拒否',
    ru: 'Отклонить',
  },
  'localFix.session.send': {
    en: 'Send',
    ko: '보내기',
    ja: '送信',
    ru: 'Отправить',
  },
  'localFix.session.setupScript': {
    en: 'Setup Script',
    ko: '설정 스크립트',
    ja: 'セットアップスクリプト',
    ru: 'Скрипт настройки',
  },
  'localFix.session.copy': {
    en: 'Copy',
    ko: '복사',
    ja: 'コピー',
    ru: 'Копировать',
  },
  'localFix.completed.title': {
    en: 'Session Complete',
    ko: '세션 완료',
    ja: 'セッション完了',
    ru: 'Сессия завершена',
  },
  'localFix.completed.description': {
    en: 'The diagnostic session has been cleaned up successfully.',
    ko: '진단 세션이 성공적으로 정리되었습니다.',
    ja: '診断セッションが正常にクリーンアップされました。',
    ru: 'Диагностическая сессия была успешно очищена.',
  },
  'localFix.completed.sessionRemoved': {
    en: 'Session removed from Local Fix',
    ko: 'Local Fix에서 세션 제거됨',
    ja: 'Local Fixからセッションを削除しました',
    ru: 'Сессия удалена из Local Fix',
  },
  'localFix.completed.scriptDeleted': {
    en: 'Setup script automatically deleted',
    ko: '설정 스크립트 자동 삭제됨',
    ja: 'セットアップスクリプトが自動的に削除されました',
    ru: 'Скрипт настройки автоматически удалён',
  },
  'localFix.completed.computerRemoved': {
    en: 'Computer removed from your Local Fix',
    ko: '컴퓨터가 Local Fix에서 제거됨',
    ja: 'コンピュータがLocal Fixから削除されました',
    ru: 'Компьютер удалён из вашего Local Fix',
  },
  'localFix.completed.newSession': {
    en: 'Start New Session',
    ko: '새 세션 시작',
    ja: '新しいセッションを開始',
    ru: 'Начать новую сессию',
  },
  'trainLlm.back': {
    en: '← Back',
    ko: '← 뒤로',
    ja: '← 戻る',
    ru: '← Назад',
  },
  'trainLlm.title': {
    en: '🎓 Train LLM',
    ko: '🎓 LLM 훈련',
    ja: '🎓 LLMトレーニング',
    ru: '🎓 Обучение LLM',
  },
  'trainLlm.subtitle': {
    en: 'Fine-tune or train language models on your datasets',
    ko: '데이터셋으로 언어 모델을 미세 조정하거나 훈련',
    ja: 'データセットで言語モデルをファインチューニングまたはトレーニング',
    ru: 'Дообучайте или обучайте языковые модели на ваших наборах данных',
  },
  'trainLlm.queue.title': {
    en: 'Training Queue',
    ko: '훈련 대기열',
    ja: 'トレーニングキュー',
    ru: 'Очередь обучения',
  },
  'trainLlm.queue.newJob': {
    en: '+ New Training Job',
    ko: '+ 새 훈련 작업',
    ja: '+ 新しいトレーニングジョブ',
    ru: '+ Новая задача обучения',
  },
  'trainLlm.queue.loading': {
    en: 'Loading training jobs...',
    ko: '훈련 작업 로딩 중...',
    ja: 'トレーニングジョブを読み込み中...',
    ru: 'Загрузка задач обучения...',
  },
  'trainLlm.queue.empty': {
    en: 'No Training Jobs Yet',
    ko: '아직 훈련 작업이 없습니다',
    ja: 'トレーニングジョブがまだありません',
    ru: 'Задач обучения пока нет',
  },
  'trainLlm.queue.emptyDesc': {
    en: 'Create your first training job to fine-tune a language model on your dataset.',
    ko: '데이터셋으로 언어 모델을 미세 조정하려면 첫 번째 훈련 작업을 만드세요.',
    ja: 'データセットで言語モデルをファインチューニングするための最初のトレーニングジョブを作成してください。',
    ru: 'Создайте первую задачу обучения для дообучения языковой модели на вашем наборе данных.',
  },
  'trainLlm.queue.createFirst': {
    en: 'Create Training Job',
    ko: '훈련 작업 생성',
    ja: 'トレーニングジョブを作成',
    ru: 'Создать задачу обучения',
  },
  'trainLlm.job.baseModel': {
    en: 'Base Model',
    ko: '기본 모델',
    ja: 'ベースモデル',
    ru: 'Базовая модель',
  },
  'trainLlm.job.dataset': {
    en: 'Dataset',
    ko: '데이터셋',
    ja: 'データセット',
    ru: 'Набор данных',
  },
  'trainLlm.job.postDataset': {
    en: 'Post-Training',
    ko: '후처리 훈련',
    ja: 'ポストトレーニング',
    ru: 'Пост-обучение',
  },
  'trainLlm.job.config': {
    en: 'Config',
    ko: '설정',
    ja: '設定',
    ru: 'Настройки',
  },
  'trainLlm.job.created': {
    en: 'Created',
    ko: '생성됨',
    ja: '作成日',
    ru: 'Создано',
  },
  'trainLlm.job.completed': {
    en: 'Completed',
    ko: '완료됨',
    ja: '完了日',
    ru: 'Завершено',
  },
  'trainLlm.job.cancel': {
    en: 'Cancel',
    ko: '취소',
    ja: 'キャンセル',
    ru: 'Отменить',
  },
  'trainLlm.job.delete': {
    en: 'Delete',
    ko: '삭제',
    ja: '削除',
    ru: 'Удалить',
  },
  'trainLlm.job.downloadGguf': {
    en: 'Download GGUF',
    ko: 'GGUF 다운로드',
    ja: 'GGUFダウンロード',
    ru: 'Скачать GGUF',
  },
  'trainLlm.job.converting': {
    en: 'Converting...',
    ko: '변환 중...',
    ja: '変換中...',
    ru: 'Конвертация...',
  },
  'trainLlm.create.title': {
    en: 'New Training Job',
    ko: '새 훈련 작업',
    ja: '新しいトレーニングジョブ',
    ru: 'Новая задача обучения',
  },
  'trainLlm.create.name': {
    en: 'Job Name',
    ko: '작업 이름',
    ja: 'ジョブ名',
    ru: 'Название задачи',
  },
  'trainLlm.create.namePlaceholder': {
    en: 'e.g. My Fine-Tuned Model',
    ko: '예: 나의 미세 조정 모델',
    ja: '例: 私のファインチューニングモデル',
    ru: 'например: Моя дообученная модель',
  },
  'trainLlm.create.baseModel': {
    en: 'Base Model',
    ko: '기본 모델',
    ja: 'ベースモデル',
    ru: 'Базовая модель',
  },
  'trainLlm.create.noModels': {
    en: 'No local models available. Ask an admin to download a model first.',
    ko: '사용 가능한 로컬 모델이 없습니다. 관리자에게 모델 다운로드를 요청하세요.',
    ja: '利用可能なローカルモデルがありません。管理者にモデルのダウンロードを依頼してください。',
    ru: 'Нет доступных локальных моделей. Попросите администратора сначала загрузить модель.',
  },
  'trainLlm.create.selectModel': {
    en: '-- Select a base model --',
    ko: '-- 기본 모델 선택 --',
    ja: '-- ベースモデルを選択 --',
    ru: '-- Выберите базовую модель --',
  },
  'trainLlm.create.dataset': {
    en: 'Training Datasets',
    ko: '훈련 데이터셋',
    ja: 'トレーニングデータセット',
    ru: 'Наборы данных для обучения',
  },
  'trainLlm.create.noDatasets': {
    en: 'No training datasets available. Create a dataset in the Datasets app first.',
    ko: '사용 가능한 학습 데이터셋이 없습니다. 먼저 데이터셋 앱에서 데이터셋을 만드세요.',
    ja: '利用可能なトレーニングデータセットがありません。まずデータセットアプリでデータセットを作成してください。',
    ru: 'Нет доступных обучающих наборов данных. Сначала создайте набор данных в приложении «Наборы данных».',
  },
  'trainLlm.create.selectDataset': {
    en: '-- Select training datasets --',
    ko: '-- 훈련 데이터셋 선택 --',
    ja: '-- トレーニングデータセットを選択 --',
    ru: '-- Выберите наборы данных для обучения --',
  },
  'trainLlm.create.postDataset': {
    en: 'Post-Training Datasets (Optional)',
    ko: '후처리 훈련 데이터셋 (선택사항)',
    ja: 'ポストトレーニングデータセット（オプション）',
    ru: 'Наборы данных для пост-обучения (необязательно)',
  },
  'trainLlm.create.noPostTrainingDatasets': {
    en: 'No post-training datasets available. Generate a post-training dataset in the Datasets app.',
    ko: '사용 가능한 사후학습 데이터셋이 없습니다. 데이터셋 앱에서 사후학습 데이터셋을 생성하세요.',
    ja: 'ポストトレーニングデータセットがありません。データセットアプリでポストトレーニングデータセットを生成してください。',
    ru: 'Нет доступных наборов пост-обучения. Создайте набор пост-обучения в приложении «Наборы данных».',
  },
  'trainLlm.create.noPostDataset': {
    en: '-- None (skip post-training) --',
    ko: '-- 없음 (후처리 훈련 건너뛰기) --',
    ja: '-- なし（ポストトレーニングをスキップ） --',
    ru: '-- Нет (пропустить пост-обучение) --',
  },
  'trainLlm.create.parameters': {
    en: 'Training Parameters',
    ko: '훈련 매개변수',
    ja: 'トレーニングパラメータ',
    ru: 'Параметры обучения',
  },
  'trainLlm.create.epochs': {
    en: 'Epochs',
    ko: '에포크',
    ja: 'エポック',
    ru: 'Эпохи',
  },
  'trainLlm.create.learningRate': {
    en: 'Learning Rate',
    ko: '학습률',
    ja: '学習率',
    ru: 'Скорость обучения',
  },
  'trainLlm.create.batchSize': {
    en: 'Batch Size',
    ko: '배치 크기',
    ja: 'バッチサイズ',
    ru: 'Размер батча',
  },
  'trainLlm.create.cancel': {
    en: 'Cancel',
    ko: '취소',
    ja: 'キャンセル',
    ru: 'Отмена',
  },
  'trainLlm.create.submit': {
    en: 'Start Training',
    ko: '훈련 시작',
    ja: 'トレーニング開始',
    ru: 'Начать обучение',
  },
  'trainLlm.create.creating': {
    en: 'Starting...',
    ko: '시작 중...',
    ja: '開始中...',
    ru: 'Запуск...',
  },
  'trainLlm.create.trainingMode': {
    en: 'Training Mode',
    ko: '훈련 모드',
    ja: 'トレーニングモード',
    ru: 'Режим обучения',
  },
  'trainLlm.create.modeFineTune': {
    en: 'Fine-Tune',
    ko: '미세 조정',
    ja: 'ファインチューニング',
    ru: 'Дообучение',
  },
  'trainLlm.create.modeFromScratch': {
    en: 'Train from Scratch',
    ko: '처음부터 훈련',
    ja: 'ゼロからトレーニング',
    ru: 'Обучение с нуля',
  },
  'trainLlm.create.modeFineTuneDesc': {
    en: 'Continue training an existing model on your dataset to adapt it to new tasks.',
    ko: '기존 모델을 데이터셋으로 계속 훈련하여 새 작업에 적응시킵니다.',
    ja: '既存のモデルをデータセットで継続的にトレーニングし、新しいタスクに適応させます。',
    ru: 'Продолжите обучение существующей модели на вашем наборе данных для адаптации к новым задачам.',
  },
  'trainLlm.create.modeFromScratchDesc': {
    en: 'Build a new tokenizer and model entirely from your dataset — no pretrained models used.',
    ko: '데이터셋에서 토크나이저와 모델을 완전히 새로 구축합니다 — 사전 훈련된 모델을 사용하지 않습니다.',
    ja: 'データセットからトークナイザーとモデルを完全に新しく構築します — 事前学習済みモデルは使用しません。',
    ru: 'Создайте новый токенизатор и модель полностью из вашего набора данных — без предобученных моделей.',
  },
  'trainLlm.create.epochsDesc': {
    en: 'Number of complete passes through the entire training dataset. More epochs can improve learning but may cause overfitting.',
    ko: '전체 훈련 데이터셋을 완전히 통과하는 횟수입니다. 에포크가 많을수록 학습이 향상될 수 있지만 과적합이 발생할 수 있습니다.',
    ja: 'トレーニングデータセット全体を通過する完全な回数です。エポックが多いほど学習が改善されますが、過学習の原因になる場合があります。',
    ru: 'Количество полных проходов по всему набору данных. Больше эпох может улучшить обучение, но может привести к переобучению.',
  },
  'trainLlm.create.learningRateDesc': {
    en: 'Controls how much the model weights are updated at each step. Lower values train slower but more precisely.',
    ko: '각 단계에서 모델 가중치가 얼마나 업데이트되는지 제어합니다. 값이 낮을수록 느리지만 더 정확하게 훈련됩니다.',
    ja: '各ステップでモデルの重みがどの程度更新されるかを制御します。値が低いほど遅いですが、より正確にトレーニングされます。',
    ru: 'Определяет, насколько обновляются веса модели на каждом шаге. Меньшие значения обучают медленнее, но точнее.',
  },
  'trainLlm.create.batchSizeDesc': {
    en: 'Number of training samples processed before updating the model. Larger batches use more memory but provide more stable training.',
    ko: '모델을 업데이트하기 전에 처리되는 훈련 샘플 수입니다. 배치가 클수록 메모리를 더 사용하지만 더 안정적인 훈련을 제공합니다.',
    ja: 'モデルを更新する前に処理されるトレーニングサンプルの数です。バッチが大きいほどメモリを多く使用しますが、より安定したトレーニングを提供します。',
    ru: 'Количество обучающих примеров, обрабатываемых перед обновлением модели. Большие батчи используют больше памяти, но обеспечивают более стабильное обучение.',
  },
  'trainLlm.job.mode': {
    en: 'Mode',
    ko: '모드',
    ja: 'モード',
    ru: 'Режим',
  },
  'trainLlm.job.modeFineTune': {
    en: 'Fine-Tune',
    ko: '미세 조정',
    ja: 'ファインチューニング',
    ru: 'Дообучение',
  },
  'trainLlm.job.modeFromScratch': {
    en: 'From Scratch',
    ko: '처음부터',
    ja: 'ゼロから',
    ru: 'С нуля',
  },
  'apps.status.risky': {
    en: 'Risky',
    ko: '위험',
    ja: 'リスクあり',
    ru: 'Рискованно',
  },
  'apps.action.launch': {
    en: 'Launch',
    ko: '실행',
    ja: '起動',
    ru: 'Запустить',
  },
  'apps.action.disabled': {
    en: 'Disabled by admin',
    ko: '관리자에 의해 비활성화됨',
    ja: '管理者によって無効化されています',
    ru: 'Отключено администратором',
  },

  // Docs navigation
  'docs.nav.getting-started': {
    en: 'Getting Started',
    ko: '시작하기',
    ja: 'はじめに',
    ru: 'Начало работы',
  },
  'docs.nav.installation': {
    en: 'Installation',
    ko: '설치',
    ja: 'インストール',
    ru: 'Установка',
  },
  'docs.nav.cloud-hosted': {
    en: 'Cloud Hosted',
    ko: '클라우드 호스팅',
    ja: 'クラウドホスト',
    ru: 'Облачный хостинг',
  },
  'docs.nav.self-hosted': {
    en: 'Self-Hosted',
    ko: '자체 호스팅',
    ja: 'セルフホスト',
    ru: 'Собственный хостинг',
  },
  'docs.nav.deployment': {
    en: 'Deployment',
    ko: '배포',
    ja: 'デプロイ',
    ru: 'Развёртывание',
  },
  'docs.nav.docker': {
    en: 'Docker',
    ko: 'Docker',
    ja: 'Docker',
    ru: 'Docker',
  },
  'docs.nav.kubernetes': {
    en: 'Kubernetes',
    ko: 'Kubernetes',
    ja: 'Kubernetes',
    ru: 'Kubernetes',
  },
  'docs.nav.api-reference': {
    en: 'API Reference',
    ko: 'API 레퍼런스',
    ja: 'APIリファレンス',
    ru: 'Справочник API',
  },
  'docs.nav.authentication': {
    en: 'Authentication',
    ko: '인증',
    ja: '認証',
    ru: 'Аутентификация',
  },
  'docs.nav.applications': {
    en: 'Applications',
    ko: '애플리케이션',
    ja: 'アプリケーション',
    ru: 'Приложения',
  },
  'docs.nav.models': {
    en: 'Models',
    ko: '모델',
    ja: 'モデル',
    ru: 'Модели',
  },
  'docs.nav.configuration': {
    en: 'Configuration',
    ko: '구성',
    ja: '設定',
    ru: 'Конфигурация',
  },
  'docs.nav.troubleshooting': {
    en: 'Troubleshooting',
    ko: '문제 해결',
    ja: 'トラブルシューティング',
    ru: 'Устранение неполадок',
  },

  // 404 Not Found page
  'notFound.badge': {
    en: '404 Error',
    ko: '404 오류',
    ja: '404 エラー',
    ru: 'Ошибка 404',
  },
  'notFound.title': {
    en: 'Page Not Found',
    ko: '페이지를 찾을 수 없습니다',
    ja: 'ページが見つかりません',
    ru: 'Страница не найдена',
  },
  'notFound.subtitle': {
    en: "The page you're looking for doesn't exist or has been moved.",
    ko: '찾고 계신 페이지가 존재하지 않거나 이동되었습니다.',
    ja: 'お探しのページは存在しないか、移動した可能性があります。',
    ru: 'Запрошенная страница не существует или была перемещена.',
  },
  'notFound.backHome': {
    en: 'Back to Home',
    ko: '홈으로 돌아가기',
    ja: 'ホームに戻る',
    ru: 'На главную',
  },
  'notFound.viewDocs': {
    en: 'View Documentation',
    ko: '문서 보기',
    ja: 'ドキュメントを見る',
    ru: 'Открыть документацию',
  },
};

const LANGUAGE_STORAGE_KEY = 'localllm_language';

interface LanguageResponse {
  success: boolean;
  language?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  readonly languages: Language[] = [
    { code: 'en', label: 'English' },
    { code: 'ko', label: '한국어' },
    { code: 'ja', label: '日本語' },
    { code: 'ru', label: 'Русский' },
  ];

  currentLanguage = signal<Language>(this.loadLanguageFromStorage());

  currentLanguageCode = computed(() => this.currentLanguage().code);

  private authenticatedUsername: string | null = null;

  constructor() {
    effect(() => {
      const username = this.authService.username();

      if (username && username !== this.authenticatedUsername) {
        this.authenticatedUsername = username;
        this.loadLanguageFromServer(username);
      } else if (!username && this.authenticatedUsername) {
        this.authenticatedUsername = null;
      }
    });
  }

  setLanguage(lang: Language): void {
    this.currentLanguage.set(lang);

    if (this.authenticatedUsername) {
      this.saveLanguageToServer(this.authenticatedUsername, lang.code);
    }

    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang.code);
    } catch {
      // Storage unavailable - silently fail
    }
  }

  private loadLanguageFromStorage(): Language {
    try {
      const code = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (code) {
        const savedLanguage = this.languages.find(lang => lang.code === code);
        if (savedLanguage) return savedLanguage;
      }
    } catch {
      // Storage unavailable - silently fail
    }
    return this.languages[0];
  }

  private loadLanguageFromServer(username: string): void {
    this.http
      .get<LanguageResponse>(`${environment.apiUrl}/api/user/language`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success && response.language) {
            const lang = this.languages.find(entry => entry.code === response.language);
            if (lang) {
              this.currentLanguage.set(lang);
              try {
                localStorage.setItem(LANGUAGE_STORAGE_KEY, lang.code);
              } catch {
                // Storage unavailable - silently fail
              }
            }
          }
        },
        error: () => {
          // Server unavailable - keep current language
        },
      });
  }

  private saveLanguageToServer(username: string, language: string): void {
    this.http
      .put<LanguageResponse>(`${environment.apiUrl}/api/user/language`, {
        language,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          // Server unavailable - silently fail, localStorage already updated
        },
      });
  }

  translate(key: string): string {
    const entry = translations[key];
    if (!entry) {
      return key;
    }
    return entry[this.currentLanguageCode()] ?? entry['en'] ?? key;
  }
}
