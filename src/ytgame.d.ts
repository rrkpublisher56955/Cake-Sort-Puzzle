/**
 * Type definitions for the official YouTube Playables SDK (ytgame)
 * Reference: https://developers.google.com/youtube/gaming/playables/reference/sdk
 */

declare namespace ytgame {
  /**
   * Whether or not the game is running within the Playables environment.
   */
  const IN_PLAYABLES_ENV: boolean;

  /**
   * The YouTube Playables SDK version.
   */
  const SDK_VERSION: string;

  /**
   * The types of errors that the YouTube Playables SDK throws.
   */
  enum SdkErrorType {
    API_UNAVAILABLE = 'API_UNAVAILABLE',
    INVALID_PARAMS = 'INVALID_PARAMS',
    SIZE_LIMIT_EXCEEDED = 'SIZE_LIMIT_EXCEEDED',
    UNKNOWN = 'UNKNOWN',
  }

  /**
   * The error object that the YouTube Playables SDK throws.
   */
  class SdkError extends Error {
    readonly errorType: SdkErrorType;
    constructor(errorType: SdkErrorType, message?: string);
  }

  /**
   * Generic game behavior APIs
   */
  namespace game {
    /**
     * Notifies YouTube that the game has begun showing frames.
     * MUST be called before gameReady().
     */
    function firstFrameReady(): void;

    /**
     * Notifies YouTube that the game is ready for players to interact with.
     * MUST NOT be called when a loading screen is still shown.
     */
    function gameReady(): void;

    /**
     * Loads game data from YouTube in the form of a serialized string.
     */
    function loadData(): Promise<string>;

    /**
     * Saves game data to YouTube in the form of a serialized string.
     * Maximum of 3 MiB, well-formed UTF-16 string.
     */
    function saveData(data: string): Promise<void>;
  }

  /**
   * System APIs
   */
  namespace system {
    /**
     * Returns the language that is set in the user's YouTube settings as BCP-47 tag.
     */
    function getLanguage(): Promise<string>;

    /**
     * Returns whether the game audio is enabled in the YouTube settings.
     */
    function isAudioEnabled(): boolean;

    /**
     * Sets a callback to be triggered when audio settings change in YouTube.
     * Returns an unset function.
     */
    function onAudioEnabledChange(callback: (isAudioEnabled: boolean) => void): () => void;

    /**
     * Sets a callback triggered when a pause game event is fired from YouTube.
     * The game has a short window to save state before eviction.
     */
    function onPause(callback: () => void): () => void;

    /**
     * Sets a callback triggered when a resume game event is fired from YouTube.
     */
    function onResume(callback: () => void): () => void;
  }

  /**
   * Player engagement APIs
   */
  namespace engagement {
    enum ContentType {
      PLAYABLE = 'PLAYABLE',
      VIDEO = 'VIDEO',
    }

    interface Content {
      id: string;
      contentType?: ContentType;
    }

    interface Score {
      value: number; // Integer <= Number.MAX_SAFE_INTEGER
    }

    /**
     * Requests YouTube to open content corresponding to the provided content ID.
     */
    function openYTContent(content: Content): Promise<void>;

    /**
     * Sends a score to YouTube to display in the YouTube UI.
     */
    function sendScore(score: Score): Promise<void>;
  }

  /**
   * Ads & Monetization APIs
   */
  namespace ads {
    /**
     * Requests an interstitial ad to be shown at natural pauses/breakpoints.
     */
    function requestInterstitialAd(): Promise<void>;

    /**
     * Requests a rewarded ad to be shown for a specific reward type.
     * Resolves with true if reward was earned, false otherwise.
     */
    function requestRewardedAd(rewardId: string): Promise<boolean>;
  }

  /**
   * Game health and telemetry APIs
   */
  namespace health {
    function logError(): void;
    function logWarning(): void;
  }
}

interface Window {
  readonly ytgame?: typeof ytgame;
}
