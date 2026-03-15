import { Injectable, signal, computed } from '@angular/core';

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
};

const LANGUAGE_STORAGE_KEY = 'localllm_language';

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  readonly languages: Language[] = [
    { code: 'en', label: 'English' },
    { code: 'ko', label: '한국어' },
    { code: 'ja', label: '日本語' },
    { code: 'ru', label: 'Русский' },
  ];

  currentLanguage = signal<Language>(this.loadLanguage());

  currentLanguageCode = computed(() => this.currentLanguage().code);

  setLanguage(lang: Language): void {
    this.currentLanguage.set(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang.code);
    } catch {
      // Storage unavailable - silently fail
    }
  }

  private loadLanguage(): Language {
    try {
      const code = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (code) {
        const savedLanguage = this.languages.find(l => l.code === code);
        if (savedLanguage) return savedLanguage;
      }
    } catch {
      // Storage unavailable - silently fail
    }
    return this.languages[0];
  }

  translate(key: string): string {
    const entry = translations[key];
    if (!entry) {
      return key;
    }
    return entry[this.currentLanguageCode()] ?? entry['en'] ?? key;
  }
}
