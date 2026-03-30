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
    ru: 'Управление репозиториями Local.LLM, размещенными на сервере. Репозитории автоматически архивируются после 1 часа бездействия, поддерживают клонирование git через ключи аутентификации и могут синхронизироваться с GitHub.',
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
