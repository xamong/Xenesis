/** 터미널 출력 순환 버퍼 — 자동화 엔진이 분석할 텍스트 창(window)을 유지한다. */
export class OutputBuffer {
  private text = '';

  constructor(private readonly maxLength = 20_000) {}

  append(chunk: string): string {
    this.text += chunk;
    if (this.text.length > this.maxLength) {
      this.text = this.text.slice(-this.maxLength);
    }
    return this.text;
  }

  clear(): void {
    this.text = '';
  }

  getText(): string {
    return this.text;
  }

  getTail(length = 4000): string {
    return this.text.slice(-length);
  }
}
