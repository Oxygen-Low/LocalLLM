import { Injectable, signal } from '@angular/core';

export interface VoiceOption {
  voice: SpeechSynthesisVoice;
  label: string;
}

/* Web Speech Recognition types – not all browsers/TS libs include these. */
interface SpeechRecognitionResultItem {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionResultEntry {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionResultItem;
}
interface SpeechRecognitionResultEvent {
  readonly resultIndex: number;
  readonly results: { readonly length: number;[index: number]: SpeechRecognitionResultEntry };
}
interface SpeechRecognitionErrorEv {
  readonly error: string;
  readonly message: string;
}
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEv) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

@Injectable({
  providedIn: 'root',
})
export class VoiceService {
  /** Whether the browser supports the Web Speech Recognition API. */
  readonly recognitionSupported: boolean;
  /** Whether the browser supports the Web Speech Synthesis (TTS) API. */
  readonly synthesisSupported: boolean;

  /** Whether voice recognition is currently active. */
  readonly isListening = signal(false);
  /** Whether TTS is currently speaking. */
  readonly isSpeaking = signal(false);
  /** Available TTS voices. */
  readonly availableVoices = signal<VoiceOption[]>([]);
  /** Currently selected TTS voice index into availableVoices(). */
  readonly selectedVoiceIndex = signal(0);
  /** Interim transcript while user is still speaking. */
  readonly interimTranscript = signal('');

  private recognition: SpeechRecognitionInstance | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    const win = window as unknown as Record<string, unknown>;
    this.recognitionSupported = !!(win['SpeechRecognition'] || win['webkitSpeechRecognition']);
    this.synthesisSupported = 'speechSynthesis' in window;

    if (this.synthesisSupported) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();
      // Voices may load asynchronously in some browsers
      this.synthesis.addEventListener('voiceschanged', () => this.loadVoices());
    }
  }

  // ---------------------------------------------------------------------------
  // TTS Voice Selection
  // ---------------------------------------------------------------------------

  private loadVoices(): void {
    if (!this.synthesis) return;
    const voices = this.synthesis.getVoices();
    if (voices.length === 0) return;

    const options: VoiceOption[] = voices.map(v => ({
      voice: v,
      label: `${v.name} (${v.lang})${v.default ? ' ★' : ''}`,
    }));
    this.availableVoices.set(options);

    // Default to first English voice, or first overall
    const englishIdx = options.findIndex(o => o.voice.lang.startsWith('en'));
    this.selectedVoiceIndex.set(englishIdx >= 0 ? englishIdx : 0);
  }

  selectVoice(index: number): void {
    if (index >= 0 && index < this.availableVoices().length) {
      this.selectedVoiceIndex.set(index);
    }
  }

  // ---------------------------------------------------------------------------
  // Speech Recognition (STT)
  // ---------------------------------------------------------------------------

  /**
   * Start listening for speech. Returns a promise that resolves with the
   * final transcript when the user stops speaking.
   */
  startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognitionSupported) {
        reject(new Error('Speech recognition is not supported in this browser'));
        return;
      }

      const win = window as unknown as Record<string, unknown>;
      const SpeechRecognitionCtor = (win['SpeechRecognition'] || win['webkitSpeechRecognition']) as { new(): SpeechRecognitionInstance };

      this.recognition = new SpeechRecognitionCtor();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = this.getRecognitionLang();

      let finalTranscript = '';

      this.recognition.onresult = (event: SpeechRecognitionResultEvent) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interim += transcript;
          }
        }
        this.interimTranscript.set(interim || finalTranscript);
      };

      this.recognition.onend = () => {
        this.isListening.set(false);
        this.interimTranscript.set('');
        resolve(finalTranscript.trim());
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEv) => {
        this.isListening.set(false);
        this.interimTranscript.set('');
        // 'no-speech' and 'aborted' are not real errors
        if (event.error === 'no-speech' || event.error === 'aborted') {
          resolve('');
        } else {
          reject(new Error(`Speech recognition error: ${event.error}`));
        }
      };

      this.isListening.set(true);
      this.recognition.start();
    });
  }

  /** Stop an active recognition session. */
  stopListening(): void {
    if (this.recognition && this.isListening()) {
      this.recognition.stop();
    }
  }

  // ---------------------------------------------------------------------------
  // Text-to-Speech (TTS)
  // ---------------------------------------------------------------------------

  /** Speak the given text using the currently selected voice. */
  speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis is not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.stopSpeaking();

      // Strip markdown formatting for cleaner TTS output
      const cleanText = this.stripMarkdown(text);
      if (!cleanText.trim()) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = this.availableVoices();
      const idx = this.selectedVoiceIndex();
      if (voices.length > 0 && idx < voices.length) {
        utterance.voice = voices[idx].voice;
      }
      utterance.rate = 1;
      utterance.pitch = 1;

      utterance.onend = () => {
        this.isSpeaking.set(false);
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        this.isSpeaking.set(false);
        this.currentUtterance = null;
        if (event.error === 'canceled' || event.error === 'interrupted') {
          resolve();
        } else {
          reject(new Error(`TTS error: ${event.error}`));
        }
      };

      this.currentUtterance = utterance;
      this.isSpeaking.set(true);
      this.synthesis.speak(utterance);
    });
  }

  /** Stop any ongoing speech. */
  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    this.isSpeaking.set(false);
    this.currentUtterance = null;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private getRecognitionLang(): string {
    const voices = this.availableVoices();
    const idx = this.selectedVoiceIndex();
    if (voices.length > 0 && idx < voices.length) {
      return voices[idx].voice.lang;
    }
    return 'en-US';
  }

  /** Remove common markdown syntax for cleaner TTS output. */
  private stripMarkdown(text: string): string {
    return text
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '(code block omitted)')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove bold/italic markers
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
      .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
      // Remove headings markers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove link syntax but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove image syntax
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // Remove horizontal rules
      .replace(/^---+$/gm, '')
      // Collapse multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
