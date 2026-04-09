import { TestBed } from '@angular/core/testing';
import { VoiceService, VoiceOption } from './voice.service';
import { vi } from 'vitest';

// Mock SpeechSynthesisUtterance for Node/test environments
class MockUtterance {
  text: string;
  voice: any = null;
  rate = 1;
  pitch = 1;
  onend: ((ev: any) => void) | null = null;
  onerror: ((ev: any) => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

(globalThis as any).SpeechSynthesisUtterance = MockUtterance;

describe('VoiceService', () => {
  let originalSpeechSynthesis: SpeechSynthesis;
  let mockSynthesis: {
    getVoices: ReturnType<typeof vi.fn>;
    speak: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
  };
  let mockVoices: Partial<SpeechSynthesisVoice>[];

  beforeEach(() => {
    mockVoices = [
      { name: 'Google US English', lang: 'en-US', default: true, localService: true, voiceURI: 'Google US English' },
      { name: 'Google French', lang: 'fr-FR', default: false, localService: true, voiceURI: 'Google French' },
      { name: 'Google UK English', lang: 'en-GB', default: false, localService: true, voiceURI: 'Google UK English' },
    ];

    mockSynthesis = {
      getVoices: vi.fn().mockReturnValue(mockVoices),
      speak: vi.fn(),
      cancel: vi.fn(),
      addEventListener: vi.fn(),
    };

    originalSpeechSynthesis = window.speechSynthesis;
    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSynthesis,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: originalSpeechSynthesis,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  function createService(): VoiceService {
    TestBed.configureTestingModule({
      providers: [VoiceService],
    });
    return TestBed.inject(VoiceService);
  }

  it('should be created', () => {
    const service = createService();
    expect(service).toBeTruthy();
  });

  it('should detect synthesis support', () => {
    const service = createService();
    expect(service.synthesisSupported).toBe(true);
  });

  it('should have default signal values', () => {
    const service = createService();
    expect(service.isListening()).toBe(false);
    expect(service.isSpeaking()).toBe(false);
    expect(service.interimTranscript()).toBe('');
  });

  it('should load voices on construction', () => {
    const service = createService();
    expect(service.availableVoices().length).toBe(3);
    expect(service.availableVoices()[0].label).toContain('Google US English');
  });

  it('should default to first English voice index', () => {
    const service = createService();
    expect(service.selectedVoiceIndex()).toBe(0);
  });

  it('should default to first voice when no English voice exists', () => {
    mockVoices = [
      { name: 'Japanese', lang: 'ja-JP', default: false, localService: true, voiceURI: 'Japanese' },
      { name: 'Chinese', lang: 'zh-CN', default: false, localService: true, voiceURI: 'Chinese' },
    ];
    mockSynthesis.getVoices.mockReturnValue(mockVoices);
    const service = createService();
    expect(service.selectedVoiceIndex()).toBe(0);
  });

  describe('selectVoice', () => {
    it('should update selectedVoiceIndex for valid index', () => {
      const service = createService();
      service.selectVoice(2);
      expect(service.selectedVoiceIndex()).toBe(2);
    });

    it('should not update for negative index', () => {
      const service = createService();
      service.selectVoice(1);
      service.selectVoice(-1);
      expect(service.selectedVoiceIndex()).toBe(1);
    });

    it('should not update for out-of-bounds index', () => {
      const service = createService();
      service.selectVoice(1);
      service.selectVoice(100);
      expect(service.selectedVoiceIndex()).toBe(1);
    });

    it('should accept index 0', () => {
      const service = createService();
      service.selectVoice(2);
      service.selectVoice(0);
      expect(service.selectedVoiceIndex()).toBe(0);
    });
  });

  describe('speak', () => {
    it('should reject when synthesis is not supported', async () => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      // Need to remove the property for the 'in' check to fail
      delete (window as any).speechSynthesis;

      const service = createService();
      await expect(service.speak('Hello')).rejects.toThrow('Speech synthesis is not supported');
    });

    it('should resolve immediately for empty text after stripping', async () => {
      const service = createService();
      const promise = service.speak('   ');
      await promise;
      expect(mockSynthesis.speak).not.toHaveBeenCalled();
    });

    it('should call synthesis.speak with utterance', async () => {
      const service = createService();
      mockSynthesis.speak.mockImplementation((utterance: MockUtterance) => {
        utterance.onend?.({} as any);
      });
      await service.speak('Hello world');
      expect(mockSynthesis.speak).toHaveBeenCalled();
    });

    it('should cancel ongoing speech before speaking new text', async () => {
      const service = createService();
      mockSynthesis.speak.mockImplementation((utterance: MockUtterance) => {
        utterance.onend?.({} as any);
      });
      await service.speak('New text');
      expect(mockSynthesis.cancel).toHaveBeenCalled();
    });

    it('should set isSpeaking to true while speaking', async () => {
      const service = createService();
      let speakingDuringSpeak = false;
      mockSynthesis.speak.mockImplementation((_utterance: MockUtterance) => {
        speakingDuringSpeak = service.isSpeaking();
        // Don't fire onend - simulate ongoing speech
      });
      // Don't await - the promise never resolves since onend is never called
      service.speak('Speaking...');
      // Allow microtask to run
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(speakingDuringSpeak).toBe(true);
    });

    it('should strip markdown code blocks from text', async () => {
      const service = createService();
      let spokenText = '';
      mockSynthesis.speak.mockImplementation((utterance: MockUtterance) => {
        spokenText = utterance.text;
        utterance.onend?.({} as any);
      });
      await service.speak('Hello ```const x = 1;``` world');
      expect(spokenText).toContain('(code block omitted)');
      expect(spokenText).not.toContain('const x = 1');
    });

    it('should strip markdown bold/italic markers', async () => {
      const service = createService();
      let spokenText = '';
      mockSynthesis.speak.mockImplementation((utterance: MockUtterance) => {
        spokenText = utterance.text;
        utterance.onend?.({} as any);
      });
      await service.speak('This is **bold** and *italic* text');
      expect(spokenText).toBe('This is bold and italic text');
    });

    it('should strip markdown headings', async () => {
      const service = createService();
      let spokenText = '';
      mockSynthesis.speak.mockImplementation((utterance: MockUtterance) => {
        spokenText = utterance.text;
        utterance.onend?.({} as any);
      });
      await service.speak('## Heading\nSome text');
      expect(spokenText).toBe('Heading\nSome text');
    });

    it('should strip markdown links but keep text', async () => {
      const service = createService();
      let spokenText = '';
      mockSynthesis.speak.mockImplementation((utterance: MockUtterance) => {
        spokenText = utterance.text;
        utterance.onend?.({} as any);
      });
      await service.speak('Click [here](https://example.com) for info');
      expect(spokenText).toBe('Click here for info');
    });

    it('should strip inline code markers', async () => {
      const service = createService();
      let spokenText = '';
      mockSynthesis.speak.mockImplementation((utterance: MockUtterance) => {
        spokenText = utterance.text;
        utterance.onend?.({} as any);
      });
      await service.speak('Use `console.log` for debugging');
      expect(spokenText).toBe('Use console.log for debugging');
    });
  });

  describe('stopSpeaking', () => {
    it('should cancel synthesis and reset isSpeaking', () => {
      const service = createService();
      service.stopSpeaking();
      expect(mockSynthesis.cancel).toHaveBeenCalled();
      expect(service.isSpeaking()).toBe(false);
    });
  });
});
