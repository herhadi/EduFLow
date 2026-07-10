import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);

  constructor(private readonly configService: ConfigService) {}

  isConfigured() {
    return Boolean(this.getBotToken());
  }

  async sendMessage(chatId: string, text: string) {
    const botToken = this.getBotToken();

    if (!botToken) {
      throw new ServiceUnavailableException('TELEGRAM_BOT_TOKEN belum dikonfigurasi');
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        disable_web_page_preview: true,
        parse_mode: 'HTML',
        text,
      }),
    });

    const body = await response.json().catch(() => null) as { ok?: boolean; description?: string } | null;

    if (!response.ok || !body?.ok) {
      const message = body?.description ?? `Telegram API error ${response.status}`;
      this.logger.warn(`Telegram sendMessage gagal: ${message}`);
      throw new ServiceUnavailableException(message);
    }

    return body;
  }

  async getWebhookInfo() {
    const botToken = this.getBotToken();

    if (!botToken) {
      throw new ServiceUnavailableException('TELEGRAM_BOT_TOKEN belum dikonfigurasi');
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const body = await response.json().catch(() => null) as {
      ok?: boolean;
      description?: string;
      result?: {
        url?: string;
        pending_update_count?: number;
        last_error_date?: number;
        last_error_message?: string;
        max_connections?: number;
      };
    } | null;

    if (!response.ok || !body?.ok) {
      const message = body?.description ?? `Telegram API error ${response.status}`;
      this.logger.warn(`Telegram getWebhookInfo gagal: ${message}`);
      throw new ServiceUnavailableException(message);
    }

    return body.result ?? {};
  }

  async setWebhook(url: string, secretToken?: string) {
    const botToken = this.getBotToken();

    if (!botToken) {
      throw new ServiceUnavailableException('TELEGRAM_BOT_TOKEN belum dikonfigurasi');
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        ...(secretToken ? { secret_token: secretToken } : {}),
      }),
    });
    const body = await response.json().catch(() => null) as {
      ok?: boolean;
      description?: string;
      result?: boolean;
    } | null;

    if (!response.ok || !body?.ok) {
      const message = body?.description ?? `Telegram API error ${response.status}`;
      this.logger.warn(`Telegram setWebhook gagal: ${message}`);
      throw new ServiceUnavailableException(message);
    }

    return body;
  }

  verifyWebhookSecret(secretToken?: string | string[]) {
    const expectedSecret = this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET');

    if (!expectedSecret) {
      return true;
    }

    return secretToken === expectedSecret;
  }

  private getBotToken() {
    return this.configService.get<string>('TELEGRAM_BOT_TOKEN')?.trim();
  }
}
