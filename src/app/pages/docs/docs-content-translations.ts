type SupportedLanguageCode = 'en' | 'ko' | 'ja' | 'ru';

const DOCS_CONTENT_TRANSLATIONS: Record<string, Partial<Record<SupportedLanguageCode, string>>> = {
  Documentation: {
    ko: '문서',
    ja: 'ドキュメント',
    ru: 'Документация',
  },
  'Getting Started': {
    ko: '시작하기',
    ja: 'はじめに',
    ru: 'Начало работы',
  },
  'Learn how to get up and running with Local.LLM in minutes.': {
    ko: '몇 분 안에 Local.LLM을 시작하고 실행하는 방법을 알아보세요.',
    ja: '数分でLocal.LLMを使い始める方法を学びましょう。',
    ru: 'Узнайте, как начать работу с Local.LLM за считанные минуты.',
  },
  'What is Local.LLM?': {
    ko: 'Local.LLM이란 무엇인가요?',
    ja: 'Local.LLMとは何ですか？',
    ru: 'Что такое Local.LLM?',
  },
  "Local.LLM is a unified platform for accessing and managing multiple AI applications. Whether you're using our cloud service or self-hosting on your own infrastructure, Local.LLM provides a consistent interface to run, manage, and scale AI workloads.": {
    ko: 'Local.LLM은 여러 AI 애플리케이션에 접근하고 관리할 수 있는 통합 플랫폼입니다. 클라우드 서비스를 사용하든 자체 인프라에 셀프 호스팅하든, Local.LLM은 AI 워크로드를 실행, 관리, 확장할 수 있는 일관된 인터페이스를 제공합니다.',
    ja: 'Local.LLMは複数のAIアプリケーションへアクセスして管理するための統合プラットフォームです。クラウドサービスを利用する場合でも、自社インフラでセルフホストする場合でも、AIワークロードの実行・管理・拡張のための一貫したインターフェースを提供します。',
    ru: 'Local.LLM — это единая платформа для доступа к нескольким ИИ-приложениям и управления ими. Используете ли вы наше облако или размещаете решение в своей инфраструктуре, Local.LLM предоставляет единый интерфейс для запуска, управления и масштабирования ИИ-нагрузок.',
  },
  'Key Features': {
    ko: '주요 기능',
    ja: '主な機能',
    ru: 'Ключевые возможности',
  },
  'Cloud & Self-Hosted:': {
    ko: '클라우드 및 자체 호스팅:',
    ja: 'クラウド & セルフホスト:',
    ru: 'Облако и собственный хостинг:',
  },
  'Deploy on our infrastructure or host it yourself': {
    ko: '당사 인프라에 배포하거나 직접 호스팅할 수 있습니다.',
    ja: '当社のインフラにデプロイすることも、自分でホストすることもできます。',
    ru: 'Разворачивайте на нашей инфраструктуре или размещайте у себя.',
  },
  'Enterprise Ready:': {
    ko: '엔터프라이즈 지원:',
    ja: 'エンタープライズ対応:',
    ru: 'Готово для бизнеса:',
  },
  'Built for production workloads with security and scalability': {
    ko: '보안과 확장성을 갖춘 프로덕션 워크로드용으로 설계되었습니다.',
    ja: 'セキュリティとスケーラビリティを備えた本番ワークロード向けに設計されています。',
    ru: 'Создано для продакшн-нагрузок с учётом безопасности и масштабируемости.',
  },
  'Open Source:': {
    ko: '오픈 소스:',
    ja: 'オープンソース:',
    ru: 'Открытый исходный код:',
  },
  'Fully transparent, community-driven development': {
    ko: '완전히 투명한 커뮤니티 중심 개발',
    ja: '完全に透明でコミュニティ主導の開発',
    ru: 'Полностью прозрачная разработка под управлением сообщества',
  },
  'Multiple AI Apps:': {
    ko: '다양한 AI 앱:',
    ja: '複数のAIアプリ:',
    ru: 'Несколько ИИ-приложений:',
  },
  'Access chatbots, code assistants, content generators, and more': {
    ko: '챗봇, 코드 어시스턴트, 콘텐츠 생성기 등 다양한 앱에 접근할 수 있습니다.',
    ja: 'チャットボット、コードアシスタント、コンテンツ生成ツールなどを利用できます。',
    ru: 'Получайте доступ к чат-ботам, помощникам для кода, генераторам контента и другим приложениям.',
  },
  'Performance Monitoring:': {
    ko: '성능 모니터링:',
    ja: 'パフォーマンス監視:',
    ru: 'Мониторинг производительности:',
  },
  'Real-time insights into resource usage and model performance': {
    ko: '리소스 사용량과 모델 성능에 대한 실시간 인사이트를 제공합니다.',
    ja: 'リソース使用量とモデル性能に関するリアルタイムの分析情報を提供します。',
    ru: 'Предоставляет аналитику в реальном времени по использованию ресурсов и производительности моделей.',
  },
  'Quick Start': {
    ko: '빠른 시작',
    ja: 'クイックスタート',
    ru: 'Быстрый старт',
  },
  'Get started with Local.LLM in three simple steps:': {
    ko: '세 가지 간단한 단계로 Local.LLM을 시작하세요:',
    ja: '3つの簡単なステップでLocal.LLMを始めましょう:',
    ru: 'Начните работу с Local.LLM за три простых шага:',
  },
  '1. Create an Account': {
    ko: '1. 계정 만들기',
    ja: '1. アカウントを作成する',
    ru: '1. Создайте аккаунт',
  },
  'Sign up at': {
    ko: '다음에서 가입하세요:',
    ja: 'こちらで登録してください:',
    ru: 'Зарегистрируйтесь на',
  },
  'to access the cloud platform.': {
    ko: '클라우드 플랫폼에 접근할 수 있습니다.',
    ja: 'クラウドプラットフォームにアクセスできます。',
    ru: 'чтобы получить доступ к облачной платформе.',
  },
  '2. Choose Your Deployment': {
    ko: '2. 배포 방식 선택',
    ja: '2. デプロイ方法を選ぶ',
    ru: '2. Выберите вариант развёртывания',
  },
  'Select between our managed cloud service or self-hosted deployment on your infrastructure.': {
    ko: '관리형 클라우드 서비스와 자체 인프라의 셀프 호스팅 배포 중에서 선택하세요.',
    ja: '当社のマネージドクラウドサービスか、自社インフラ上のセルフホストデプロイを選択してください。',
    ru: 'Выберите между нашим управляемым облачным сервисом и самостоятельным развёртыванием в вашей инфраструктуре.',
  },
  '3. Launch Your First App': {
    ko: '3. 첫 앱 실행',
    ja: '3. 最初のアプリを起動する',
    ru: '3. Запустите первое приложение',
  },
  'Browse the application dashboard and launch any AI app to start using it immediately.': {
    ko: '애플리케이션 대시보드를 둘러보고 원하는 AI 앱을 실행해 즉시 사용을 시작하세요.',
    ja: 'アプリケーションダッシュボードを開き、任意のAIアプリを起動してすぐに使い始めましょう。',
    ru: 'Откройте панель приложений и запустите любое ИИ-приложение, чтобы сразу начать работу.',
  },
  'Next Steps': {
    ko: '다음 단계',
    ja: '次のステップ',
    ru: 'Следующие шаги',
  },
  '→ Installation Guide': {
    ko: '→ 설치 가이드',
    ja: '→ インストールガイド',
    ru: '→ Руководство по установке',
  },
  '→ Deployment Options': {
    ko: '→ 배포 옵션',
    ja: '→ デプロイオプション',
    ru: '→ Варианты развёртывания',
  },
  '→ API Reference': {
    ko: '→ API 레퍼런스',
    ja: '→ APIリファレンス',
    ru: '→ Справочник API',
  },
  Installation: {
    ko: '설치',
    ja: 'インストール',
    ru: 'Установка',
  },
  'Choose your installation method: cloud-hosted or self-hosted.': {
    ko: '설치 방법을 선택하세요: 클라우드 호스팅 또는 자체 호스팅.',
    ja: 'インストール方法を選択してください: クラウドホストまたはセルフホスト。',
    ru: 'Выберите способ установки: облако или собственный хостинг.',
  },
  'Cloud Hosted Installation': {
    ko: '클라우드 호스팅 설치',
    ja: 'クラウドホスト版の導入',
    ru: 'Установка в облаке',
  },
  'The quickest way to get started with Local.LLM is to use our managed cloud service. No installation needed!': {
    ko: 'Local.LLM을 가장 빠르게 시작하는 방법은 당사의 관리형 클라우드 서비스를 사용하는 것입니다. 설치가 필요하지 않습니다!',
    ja: 'Local.LLMを最も素早く使い始める方法は、当社のマネージドクラウドサービスを利用することです。インストールは不要です。',
    ru: 'Самый быстрый способ начать работу с Local.LLM — воспользоваться нашим управляемым облачным сервисом. Установка не требуется!',
  },
  Visit: {
    ko: '방문:',
    ja: 'アクセス:',
    ru: 'Перейдите на',
  },
  'Click "Sign Up" and create your account': {
    ko: '"Sign Up"을 클릭하고 계정을 만드세요.',
    ja: '「Sign Up」をクリックしてアカウントを作成します。',
    ru: 'Нажмите «Sign Up» и создайте аккаунт',
  },
  'Verify your email and log in': {
    ko: '이메일을 인증하고 로그인하세요.',
    ja: 'メールを確認してログインします。',
    ru: 'Подтвердите адрес электронной почты и войдите в систему',
  },
  'Start using AI applications immediately': {
    ko: '즉시 AI 애플리케이션 사용을 시작하세요.',
    ja: 'すぐにAIアプリケーションを使い始められます。',
    ru: 'Сразу начните пользоваться ИИ-приложениями',
  },
  Tip: {
    ko: '팁:',
    ja: 'ヒント:',
    ru: 'Совет:',
  },
  'Cloud hosted accounts include free trial credits. No credit card required.': {
    ko: '클라우드 호스팅 계정에는 무료 체험 크레딧이 포함됩니다. 신용카드는 필요하지 않습니다.',
    ja: 'クラウドホストのアカウントには無料トライアルクレジットが含まれます。クレジットカードは不要です。',
    ru: 'Облачные аккаунты включают бесплатные пробные кредиты. Кредитная карта не требуется.',
  },
  'Self-Hosted Installation': {
    ko: '자체 호스팅 설치',
    ja: 'セルフホスト版の導入',
    ru: 'Собственная установка',
  },
  'For complete control and privacy, you can self-host Local.LLM on your own infrastructure.': {
    ko: '완전한 제어와 프라이버시를 위해 Local.LLM을 자체 인프라에 셀프 호스팅할 수 있습니다.',
    ja: '完全な制御とプライバシーのために、Local.LLMを自社インフラにセルフホストできます。',
    ru: 'Для полного контроля и конфиденциальности вы можете разместить Local.LLM в собственной инфраструктуре.',
  },
  Requirements: {
    ko: '요구 사항',
    ja: '要件',
    ru: 'Требования',
  },
  'Docker and Docker Compose (recommended)': {
    ko: 'Docker 및 Docker Compose(권장)',
    ja: 'Docker と Docker Compose（推奨）',
    ru: 'Docker и Docker Compose (рекомендуется)',
  },
  'At least 2GB RAM': {
    ko: '최소 2GB RAM',
    ja: '少なくとも2GBのRAM',
    ru: 'Минимум 2 ГБ ОЗУ',
  },
  'Linux, macOS, or Windows (with WSL2)': {
    ko: 'Linux, macOS 또는 Windows(WSL2 포함)',
    ja: 'Linux、macOS、または Windows（WSL2 付き）',
    ru: 'Linux, macOS или Windows (с WSL2)',
  },
  'Open ports 8000 (API) and 3000 (Web UI)': {
    ko: '포트 8000(API) 및 3000(Web UI) 개방',
    ja: 'ポート 8000（API）と 3000（Web UI）を開放',
    ru: 'Открытые порты 8000 (API) и 3000 (веб-интерфейс)',
  },
  'Installation Steps': {
    ko: '설치 단계',
    ja: 'インストール手順',
    ru: 'Шаги установки',
  },
  'See the': {
    ko: '다음 문서를 참조하세요:',
    ja: '次を参照してください:',
    ru: 'См.',
  },
  'Self-Hosted Installation Guide': {
    ko: '자체 호스팅 설치 가이드',
    ja: 'セルフホスト導入ガイド',
    ru: 'Руководство по собственной установке',
  },
  'for detailed instructions.': {
    ko: '자세한 지침을 확인하세요.',
    ja: '詳細な手順を確認してください。',
    ru: 'для получения подробных инструкций.',
  },
  'System Requirements': {
    ko: '시스템 요구 사항',
    ja: 'システム要件',
    ru: 'Системные требования',
  },
  'Minimum (Development)': {
    ko: '최소 사양(개발)',
    ja: '最小構成（開発）',
    ru: 'Минимум (разработка)',
  },
  '2GB RAM, 2 CPU cores, 10GB storage': {
    ko: '2GB RAM, CPU 2코어, 10GB 저장 공간',
    ja: '2GB RAM、CPU 2 コア、10GB ストレージ',
    ru: '2 ГБ ОЗУ, 2 ядра CPU, 10 ГБ хранилища',
  },
  'Recommended (Production)': {
    ko: '권장 사양(프로덕션)',
    ja: '推奨構成（本番）',
    ru: 'Рекомендуется (продакшн)',
  },
  '8GB+ RAM, 4+ CPU cores, 50GB+ storage': {
    ko: '8GB 이상 RAM, CPU 4코어 이상, 저장 공간 50GB 이상',
    ja: '8GB 以上の RAM、4 コア以上の CPU、50GB 以上のストレージ',
    ru: '8+ ГБ ОЗУ, 4+ ядра CPU, 50+ ГБ хранилища',
  },
  'GPU Support (Optional)': {
    ko: 'GPU 지원(선택 사항)',
    ja: 'GPU サポート（任意）',
    ru: 'Поддержка GPU (необязательно)',
  },
  'NVIDIA GPUs with CUDA support for accelerated inference': {
    ko: '가속 추론을 위한 CUDA 지원 NVIDIA GPU',
    ja: '高速推論のための CUDA 対応 NVIDIA GPU',
    ru: 'GPU NVIDIA с поддержкой CUDA для ускоренного инференса',
  },
  Deployment: {
    ko: '배포',
    ja: 'デプロイ',
    ru: 'Развёртывание',
  },
  'Deploy Local.LLM on your infrastructure using Docker, Kubernetes, or other container platforms.': {
    ko: 'Docker, Kubernetes 또는 기타 컨테이너 플랫폼을 사용해 자체 인프라에 Local.LLM을 배포하세요.',
    ja: 'Docker、Kubernetes、その他のコンテナプラットフォームを使って自社インフラにLocal.LLMをデプロイできます。',
    ru: 'Разворачивайте Local.LLM в своей инфраструктуре с помощью Docker, Kubernetes или других контейнерных платформ.',
  },
  'Deployment Options': {
    ko: '배포 옵션',
    ja: 'デプロイオプション',
    ru: 'Варианты развёртывания',
  },
  'Docker Deployment': {
    ko: 'Docker 배포',
    ja: 'Docker デプロイ',
    ru: 'Развёртывание с Docker',
  },
  'The recommended way to deploy Local.LLM. Docker ensures consistent deployment across different environments.': {
    ko: 'Local.LLM을 배포하는 권장 방법입니다. Docker는 서로 다른 환경에서도 일관된 배포를 보장합니다.',
    ja: 'Local.LLMをデプロイする推奨方法です。Dockerにより異なる環境でも一貫したデプロイを実現できます。',
    ru: 'Рекомендуемый способ развёртывания Local.LLM. Docker обеспечивает одинаковое поведение в разных средах.',
  },
  'Kubernetes Deployment': {
    ko: 'Kubernetes 배포',
    ja: 'Kubernetes デプロイ',
    ru: 'Развёртывание в Kubernetes',
  },
  'For enterprise-scale deployments with automatic scaling, high availability, and advanced management.': {
    ko: '자동 확장, 고가용성, 고급 관리가 필요한 엔터프라이즈 규모 배포에 적합합니다.',
    ja: '自動スケーリング、高可用性、高度な管理が必要なエンタープライズ規模のデプロイ向けです。',
    ru: 'Подходит для корпоративных развёртываний с автоскейлингом, высокой доступностью и расширенным управлением.',
  },
  'View Docker Deployment Guide →': {
    ko: 'Docker 배포 가이드 보기 →',
    ja: 'Docker デプロイガイドを見る →',
    ru: 'Открыть руководство по Docker →',
  },
  'View Kubernetes Deployment Guide →': {
    ko: 'Kubernetes 배포 가이드 보기 →',
    ja: 'Kubernetes デプロイガイドを見る →',
    ru: 'Открыть руководство по Kubernetes →',
  },
  'Quick Start with Docker': {
    ko: 'Docker로 빠르게 시작하기',
    ja: 'Docker でクイックスタート',
    ru: 'Быстрый старт с Docker',
  },
  'The simplest way to run Local.LLM is using our official Docker image:': {
    ko: 'Local.LLM을 실행하는 가장 쉬운 방법은 공식 Docker 이미지를 사용하는 것입니다:',
    ja: 'Local.LLMを実行する最も簡単な方法は、公式Dockerイメージを使うことです:',
    ru: 'Самый простой способ запустить Local.LLM — использовать наш официальный Docker-образ:',
  },
  'for all available options.': {
    ko: '사용 가능한 모든 옵션을 확인하세요.',
    ja: '利用可能なすべてのオプションを確認してください。',
    ru: 'чтобы увидеть все доступные параметры.',
  },
  'Configuration Guide': {
    ko: '설정 가이드',
    ja: '設定ガイド',
    ru: 'Руководство по настройке',
  },
  Configuration: {
    ko: '구성',
    ja: '設定',
    ru: 'Конфигурация',
  },
  'Complete reference for configuring Local.LLM using environment variables.': {
    ko: '환경 변수를 사용해 Local.LLM을 설정하는 전체 참조입니다.',
    ja: '環境変数を使ってLocal.LLMを設定するための完全なリファレンスです。',
    ru: 'Полное справочное руководство по настройке Local.LLM через переменные окружения.',
  },
  'Configure Local.LLM using environment variables. Common configuration options:': {
    ko: '환경 변수를 사용해 Local.LLM을 설정합니다. 일반적인 구성 옵션은 다음과 같습니다:',
    ja: '環境変数を使ってLocal.LLMを設定します。一般的な設定項目は次のとおりです:',
    ru: 'Настройте Local.LLM с помощью переменных окружения. Основные параметры:',
  },
  'Environment Configuration': {
    ko: '환경 설정',
    ja: '環境設定',
    ru: 'Настройка окружения',
  },
  'Server Configuration': {
    ko: '서버 설정',
    ja: 'サーバー設定',
    ru: 'Конфигурация сервера',
  },
  'Database Configuration': {
    ko: '데이터베이스 설정',
    ja: 'データベース設定',
    ru: 'Настройка базы данных',
  },
  'AI Model Settings': {
    ko: 'AI 모델 설정',
    ja: 'AI モデル設定',
    ru: 'Настройки ИИ-моделей',
  },
  'Deployment Settings': {
    ko: '배포 설정',
    ja: 'デプロイ設定',
    ru: 'Настройки развёртывания',
  },
  'Production Configuration Example': {
    ko: '프로덕션 설정 예시',
    ja: '本番設定の例',
    ru: 'Пример конфигурации для продакшна',
  },
  'Complete example of a production-ready .env file:': {
    ko: '프로덕션용 .env 파일의 전체 예시:',
    ja: '本番環境向け .env ファイルの完全な例:',
    ru: 'Полный пример .env-файла для продакшна:',
  },
  'Monitoring and Logging': {
    ko: '모니터링 및 로깅',
    ja: '監視とロギング',
    ru: 'Мониторинг и логирование',
  },
  Troubleshooting: {
    ko: '문제 해결',
    ja: 'トラブルシューティング',
    ru: 'Устранение неполадок',
  },
  'Common issues and solutions for Local.LLM deployments.': {
    ko: 'Local.LLM 배포에서 자주 발생하는 문제와 해결 방법입니다.',
    ja: 'Local.LLM のデプロイでよくある問題と解決策です。',
    ru: 'Типичные проблемы при развёртывании Local.LLM и способы их решения.',
  },
  'Common Issues': {
    ko: '일반적인 문제',
    ja: 'よくある問題',
    ru: 'Распространённые проблемы',
  },
  'Application won\'t start': {
    ko: '애플리케이션이 시작되지 않음',
    ja: 'アプリケーションが起動しない',
    ru: 'Приложение не запускается',
  },
  'The Local.LLM service fails to start or crashes immediately.': {
    ko: 'Local.LLM 서비스가 시작되지 않거나 즉시 종료됩니다.',
    ja: 'Local.LLM サービスが起動しない、またはすぐにクラッシュします。',
    ru: 'Сервис Local.LLM не запускается или сразу завершается.',
  },
  'Check system resources': {
    ko: '시스템 리소스 확인',
    ja: 'システムリソースを確認',
    ru: 'Проверьте ресурсы системы',
  },
  'Verify environment variables': {
    ko: '환경 변수 확인',
    ja: '環境変数を確認',
    ru: 'Проверьте переменные окружения',
  },
  'Check the logs': {
    ko: '로그 확인',
    ja: 'ログを確認',
    ru: 'Проверьте логи',
  },
  'Out of Memory': {
    ko: '메모리 부족',
    ja: 'メモリ不足',
    ru: 'Недостаточно памяти',
  },
  'Application crashes due to insufficient memory.': {
    ko: '메모리가 부족해 애플리케이션이 종료됩니다.',
    ja: 'メモリ不足によりアプリケーションがクラッシュします。',
    ru: 'Приложение завершается из-за нехватки памяти.',
  },
  'Reduce model cache size': {
    ko: '모델 캐시 크기 줄이기',
    ja: 'モデルキャッシュサイズを減らす',
    ru: 'Уменьшите размер кэша моделей',
  },
  'Reduce concurrent requests': {
    ko: '동시 요청 수 줄이기',
    ja: '同時リクエスト数を減らす',
    ru: 'Сократите число одновременных запросов',
  },
  'Increase available RAM': {
    ko: '사용 가능한 RAM 늘리기',
    ja: '利用可能な RAM を増やす',
    ru: 'Увеличьте объём доступной ОЗУ',
  },
  'Performance Optimization': {
    ko: '성능 최적화',
    ja: 'パフォーマンス最適化',
    ru: 'Оптимизация производительности',
  },
  'Enable GPU acceleration': {
    ko: 'GPU 가속 활성화',
    ja: 'GPU アクセラレーションを有効化',
    ru: 'Включите ускорение GPU',
  },
  'Use smaller models': {
    ko: '더 작은 모델 사용',
    ja: 'より小さなモデルを使用',
    ru: 'Используйте более лёгкие модели',
  },
  'Increase model cache': {
    ko: '모델 캐시 늘리기',
    ja: 'モデルキャッシュを増やす',
    ru: 'Увеличьте кэш моделей',
  },
  'Use request caching': {
    ko: '요청 캐싱 사용',
    ja: 'リクエストキャッシュを利用',
    ru: 'Используйте кэширование запросов',
  },
  'Getting Help': {
    ko: '도움 받기',
    ja: 'ヘルプを得る',
    ru: 'Получение помощи',
  },
  'Check the': {
    ko: '다음을 확인하세요:',
    ja: '次を確認してください:',
    ru: 'Проверьте',
  },
  'full documentation': {
    ko: '전체 문서',
    ja: '完全なドキュメント',
    ru: 'полную документацию',
  },
  'Join our': {
    ko: '참여하세요:',
    ja: '参加してください:',
    ru: 'Присоединяйтесь к нашему',
  },
  'community Discord': {
    ko: '커뮤니티 Discord',
    ja: 'コミュニティ Discord',
    ru: 'сообществу в Discord',
  },
  'Report issues on': {
    ko: '문제 보고:',
    ja: '問題を報告:',
    ru: 'Сообщайте о проблемах на',
  },
  GitHub: {
    ko: 'GitHub',
    ja: 'GitHub',
    ru: 'GitHub',
  },
  'Email support at': {
    ko: '다음 주소로 지원 문의:',
    ja: 'サポートへの連絡先:',
    ru: 'Напишите в поддержку на',
  },
  'Authentication API': {
    ko: '인증 API',
    ja: '認証 API',
    ru: 'API аутентификации',
  },
  'Learn how to authenticate requests to the Local.LLM API using API keys and JWT tokens.': {
    ko: 'API 키와 JWT 토큰을 사용해 Local.LLM API 요청을 인증하는 방법을 알아보세요.',
    ja: 'API キーと JWT トークンを使って Local.LLM API リクエストを認証する方法を学びましょう。',
    ru: 'Узнайте, как аутентифицировать запросы к API Local.LLM с помощью API-ключей и JWT-токенов.',
  },
  Overview: {
    ko: '개요',
    ja: '概要',
    ru: 'Обзор',
  },
  'Local.LLM supports two authentication methods:': {
    ko: 'Local.LLM은 두 가지 인증 방식을 지원합니다:',
    ja: 'Local.LLM は 2 つの認証方式をサポートしています:',
    ru: 'Local.LLM поддерживает два способа аутентификации:',
  },
  'API Key Authentication (Bearer Token)': {
    ko: 'API 키 인증(Bearer 토큰)',
    ja: 'API キー認証（Bearer トークン）',
    ru: 'Аутентификация по API-ключу (Bearer Token)',
  },
  'API Reference': {
    ko: 'API 레퍼런스',
    ja: 'APIリファレンス',
    ru: 'Справочник API',
  },
  Authentication: {
    ko: '인증',
    ja: '認証',
    ru: 'Аутентификация',
  },
  '- Recommended for service-to-service communication': {
    ko: '- 서비스 간 통신에 권장됩니다.',
    ja: '- サービス間通信に推奨されます。',
    ru: '- Рекомендуется для взаимодействия между сервисами',
  },
  'JWT Token Authentication': {
    ko: 'JWT 토큰 인증',
    ja: 'JWT トークン認証',
    ru: 'Аутентификация по JWT-токену',
  },
  '- For user sessions and web applications': {
    ko: '- 사용자 세션 및 웹 애플리케이션용',
    ja: '- ユーザーセッションと Web アプリケーション向け',
    ru: '- Для пользовательских сессий и веб-приложений',
  },
  'Use API keys for service-to-service communication and integrations. This is the simplest method.': {
    ko: '서비스 간 통신과 통합에는 API 키를 사용하세요. 가장 간단한 방법입니다.',
    ja: 'サービス間通信や統合には API キーを使用します。最もシンプルな方法です。',
    ru: 'Используйте API-ключи для интеграций и взаимодействия между сервисами. Это самый простой способ.',
  },
  'Getting Your API Key': {
    ko: 'API 키 받기',
    ja: 'API キーの取得',
    ru: 'Получение API-ключа',
  },
  "Your API key is generated when Local.LLM initializes. It's stored in the": {
    ko: 'API 키는 Local.LLM 초기화 시 생성되며 다음 위치에 저장됩니다:',
    ja: 'API キーは Local.LLM の初期化時に生成され、次の場所に保存されます:',
    ru: 'Ваш API-ключ создаётся при инициализации Local.LLM и хранится в',
  },
  'environment variable.': {
    ko: '환경 변수입니다.',
    ja: '環境変数です。',
    ru: 'как переменная окружения.',
  },
  'Using API Keys': {
    ko: 'API 키 사용하기',
    ja: 'API キーの利用',
    ru: 'Использование API-ключей',
  },
  'Include your API key in the': {
    ko: 'API 키를 다음에 포함하세요:',
    ja: 'API キーを次に含めます:',
    ru: 'Укажите API-ключ в',
  },
  'header:': {
    ko: '헤더:',
    ja: 'ヘッダー:',
    ru: 'заголовке:',
  },
  'Security:': {
    ko: '보안:',
    ja: 'セキュリティ:',
    ru: 'Безопасность:',
  },
  'Treat API keys like passwords. Never commit them to version control or expose them in client-side code.': {
    ko: 'API 키는 비밀번호처럼 다뤄야 합니다. 버전 관리에 커밋하거나 클라이언트 측 코드에 노출하지 마세요.',
    ja: 'API キーはパスワードのように扱ってください。バージョン管理へコミットしたり、クライアント側コードへ公開したりしないでください。',
    ru: 'Относитесь к API-ключам как к паролям. Никогда не коммитьте их в систему контроля версий и не раскрывайте в клиентском коде.',
  },
  'Applications API': {
    ko: '애플리케이션 API',
    ja: 'アプリケーション API',
    ru: 'API приложений',
  },
  'Manage and interact with AI applications through the Local.LLM API.': {
    ko: 'Local.LLM API를 통해 AI 애플리케이션을 관리하고 상호작용하세요.',
    ja: 'Local.LLM API を通じて AI アプリケーションを管理・操作できます。',
    ru: 'Управляйте ИИ-приложениями и взаимодействуйте с ними через API Local.LLM.',
  },
  'Get All Applications': {
    ko: '모든 애플리케이션 조회',
    ja: 'すべてのアプリケーションを取得',
    ru: 'Получить все приложения',
  },
  'Retrieve a list of all available AI applications.': {
    ko: '사용 가능한 모든 AI 애플리케이션 목록을 가져옵니다.',
    ja: '利用可能なすべての AI アプリケーションの一覧を取得します。',
    ru: 'Получить список всех доступных ИИ-приложений.',
  },
  'Get Application Details': {
    ko: '애플리케이션 세부 정보 조회',
    ja: 'アプリケーション詳細の取得',
    ru: 'Получить сведения о приложении',
  },
  'Retrieve detailed information about a specific application.': {
    ko: '특정 애플리케이션의 자세한 정보를 가져옵니다.',
    ja: '特定のアプリケーションの詳細情報を取得します。',
    ru: 'Получить подробную информацию о конкретном приложении.',
  },
  'Launch Application': {
    ko: '애플리케이션 실행',
    ja: 'アプリケーションを起動',
    ru: 'Запустить приложение',
  },
  'Start an application instance with custom configuration.': {
    ko: '사용자 지정 설정으로 애플리케이션 인스턴스를 시작합니다.',
    ja: 'カスタム設定でアプリケーションインスタンスを起動します。',
    ru: 'Запускает экземпляр приложения с пользовательской конфигурацией.',
  },
  'Get Application Status': {
    ko: '애플리케이션 상태 조회',
    ja: 'アプリケーション状態の取得',
    ru: 'Получить статус приложения',
  },
  'Check the current status of a running application instance.': {
    ko: '실행 중인 애플리케이션 인스턴스의 현재 상태를 확인합니다.',
    ja: '実行中のアプリケーションインスタンスの現在の状態を確認します。',
    ru: 'Проверьте текущее состояние работающего экземпляра приложения.',
  },
  'Stop Application': {
    ko: '애플리케이션 중지',
    ja: 'アプリケーションを停止',
    ru: 'Остановить приложение',
  },
  'Stop a running application instance.': {
    ko: '실행 중인 애플리케이션 인스턴스를 중지합니다.',
    ja: '実行中のアプリケーションインスタンスを停止します。',
    ru: 'Останавливает работающий экземпляр приложения.',
  },
  'Error Handling': {
    ko: '오류 처리',
    ja: 'エラー処理',
    ru: 'Обработка ошибок',
  },
  'Example Request': {
    ko: '요청 예시',
    ja: 'リクエスト例',
    ru: 'Пример запроса',
  },
  Response: {
    ko: '응답',
    ja: 'レスポンス',
    ru: 'Ответ',
  },
  'Response:': {
    ko: '응답:',
    ja: 'レスポンス:',
    ru: 'Ответ:',
  },
  Parameters: {
    ko: '매개변수',
    ja: 'パラメーター',
    ru: 'Параметры',
  },
  Parameter: {
    ko: '매개변수',
    ja: 'パラメーター',
    ru: 'Параметр',
  },
  Description: {
    ko: '설명',
    ja: '説明',
    ru: 'Описание',
  },
  Type: {
    ko: '유형',
    ja: '型',
    ru: 'Тип',
  },
  'Request Body': {
    ko: '요청 본문',
    ja: 'リクエストボディ',
    ru: 'Тело запроса',
  },
  'Request Headers': {
    ko: '요청 헤더',
    ja: 'リクエストヘッダー',
    ru: 'Заголовки запроса',
  },
  Required: {
    ko: '필수',
    ja: '必須',
    ru: 'Обязательно',
  },
  Yes: {
    ko: '예',
    ja: 'はい',
    ru: 'Да',
  },
  Recommended: {
    ko: '권장',
    ja: '推奨',
    ru: 'Рекомендуется',
  },
  'Error Responses': {
    ko: '오류 응답',
    ja: 'エラーレスポンス',
    ru: 'Ответы с ошибками',
  },
  'Security Best Practices': {
    ko: '보안 모범 사례',
    ja: 'セキュリティのベストプラクティス',
    ru: 'Лучшие практики безопасности',
  },
  'API: Applications': {
    ko: 'API: 애플리케이션',
    ja: 'API: アプリケーション',
    ru: 'API: Приложения',
  },
  '- List and manage AI applications': {
    ko: '- AI 애플리케이션을 나열하고 관리합니다.',
    ja: '- AI アプリケーションの一覧表示と管理を行います。',
    ru: '- Просмотр и управление ИИ-приложениями',
  },
  'API: Models': {
    ko: 'API: 모델',
    ja: 'API: モデル',
    ru: 'API: Модели',
  },
  '- Work with AI models': {
    ko: '- AI 모델을 다룹니다.',
    ja: '- AI モデルを操作します。',
    ru: '- Работа с ИИ-моделями',
  },
  'API: Authentication': {
    ko: 'API: 인증',
    ja: 'API: 認証',
    ru: 'API: Аутентификация',
  },
  '- Learn about API security': {
    ko: '- API 보안에 대해 알아보세요.',
    ja: '- API セキュリティについて学びます。',
    ru: '- Узнайте о безопасности API',
  },
  '- Configure authentication settings': {
    ko: '- 인증 설정을 구성합니다.',
    ja: '- 認証設定を構成します。',
    ru: '- Настройте параметры аутентификации',
  },
  '- Configure your deployment': {
    ko: '- 배포를 구성합니다.',
    ja: '- デプロイ設定を行います。',
    ru: '- Настройте развёртывание',
  },
  '- Configure models and deployment': {
    ko: '- 모델과 배포를 구성합니다.',
    ja: '- モデルとデプロイを設定します。',
    ru: '- Настройте модели и развёртывание',
  },
  '- Learn about all available environment variables': {
    ko: '- 사용 가능한 모든 환경 변수를 알아보세요.',
    ja: '- 利用可能なすべての環境変数を確認します。',
    ru: '- Узнайте обо всех доступных переменных окружения',
  },
  '- Explore the Local.LLM API': {
    ko: '- Local.LLM API를 살펴보세요.',
    ja: '- Local.LLM API を確認します。',
    ru: '- Изучите API Local.LLM',
  },
  '- Common issues and solutions': {
    ko: '- 일반적인 문제와 해결 방법',
    ja: '- よくある問題と解決策',
    ru: '- Типичные проблемы и решения',
  },
  '- Learn how to deploy Local.LLM': {
    ko: '- Local.LLM 배포 방법을 알아보세요.',
    ja: '- Local.LLM のデプロイ方法を学びます。',
    ru: '- Узнайте, как развернуть Local.LLM',
  },
  'Models API': {
    ko: '모델 API',
    ja: 'モデル API',
    ru: 'API моделей',
  },
  'Query, manage, and interact with AI models in Local.LLM.': {
    ko: 'Local.LLM에서 AI 모델을 조회, 관리, 활용하는 방법을 제공합니다.',
    ja: 'Local.LLM 内で AI モデルを検索・管理・利用するための API です。',
    ru: 'Позволяет запрашивать, управлять и использовать ИИ-модели в Local.LLM.',
  },
  'List Available Models': {
    ko: '사용 가능한 모델 목록',
    ja: '利用可能なモデル一覧',
    ru: 'Список доступных моделей',
  },
  'Retrieve a list of all available AI models.': {
    ko: '사용 가능한 모든 AI 모델 목록을 가져옵니다.',
    ja: '利用可能なすべての AI モデルの一覧を取得します。',
    ru: 'Получить список всех доступных ИИ-моделей.',
  },
  'Get Model Details': {
    ko: '모델 세부 정보 조회',
    ja: 'モデル詳細の取得',
    ru: 'Получить сведения о модели',
  },
  'Retrieve detailed information about a specific model.': {
    ko: '특정 모델의 자세한 정보를 가져옵니다.',
    ja: '特定のモデルの詳細情報を取得します。',
    ru: 'Получить подробную информацию о конкретной модели.',
  },
  'Complete API Request': {
    ko: '완성 요청 API',
    ja: '補完リクエスト API',
    ru: 'API запроса на генерацию',
  },
  'Send a request to an AI model for processing.': {
    ko: 'AI 모델에 처리 요청을 보냅니다.',
    ja: 'AI モデルへ処理リクエストを送信します。',
    ru: 'Отправляет запрос на обработку в ИИ-модель.',
  },
  'Stream Completion': {
    ko: '스트림 응답',
    ja: 'ストリーミング補完',
    ru: 'Потоковая генерация',
  },
  'Stream responses for real-time output as tokens are generated.': {
    ko: '토큰이 생성되는 동안 실시간으로 스트리밍 응답을 받습니다.',
    ja: 'トークン生成に合わせてリアルタイムで応答をストリーミングします。',
    ru: 'Стримит ответы в реальном времени по мере генерации токенов.',
  },
};

export function translateDocsContentText(text: string, languageCode: string): string | null {
  if (languageCode === 'en') {
    return text;
  }

  return DOCS_CONTENT_TRANSLATIONS[text]?.[languageCode as SupportedLanguageCode] ?? null;
}
