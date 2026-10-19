
export class BrowserStorage {
  static read<T>(key: string): T | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const value = window.localStorage.getItem(key);

      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  static write<T>(key: string, value: T): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      window.localStorage.setItem(
        key,
        JSON.stringify(value)
      );

      return true;
    } catch {
      return false;
    }
  }

  static remove(key: string): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
}

