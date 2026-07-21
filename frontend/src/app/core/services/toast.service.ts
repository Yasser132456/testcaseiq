import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  exiting: boolean;
  progress: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);

  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  show(message: string, type: ToastType): void {
    const toast: ToastItem = { id: this.nextId++, message, type, exiting: false, progress: false };
    this.toasts.update((items) => [...items, toast]);
    this.timers.set(toast.id, setTimeout(() => this.dismiss(toast.id), 4000));
  }

  showProgress(message: string, type: ToastType = 'info'): number {
    const toast: ToastItem = { id: this.nextId++, message, type, exiting: false, progress: true };
    this.toasts.update((items) => [...items, toast]);
    return toast.id;
  }

  settleProgress(id: number, message: string, type: ToastType): void {
    this.toasts.update((items) => items.map((item) => (
      item.id === id ? { ...item, message, type, progress: false } : item
    )));
    if (this.toasts().some((item) => item.id === id)) {
      this.timers.set(id, setTimeout(() => this.dismiss(id), 4000));
    }
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
