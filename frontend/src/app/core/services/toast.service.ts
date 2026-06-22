import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  exiting: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);

  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  show(message: string, type: ToastType): void {
    const toast: ToastItem = { id: this.nextId++, message, type, exiting: false };
    this.toasts.update((items) => [...items, toast]);
    this.timers.set(toast.id, setTimeout(() => this.dismiss(toast.id), 4000));
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts.update((items) => items.map((item) => (
      item.id === id ? { ...item, exiting: true } : item
    )));
  }

  remove(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts.update((items) => items.filter((item) => item.id !== id));
  }
}
