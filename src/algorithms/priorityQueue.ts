/**
 * Generic Min-Priority Queue backed by a binary min-heap
 * Provides O(log N) insertion and extraction for high-performance A* search.
 */
export interface PriorityItem<T> {
  value: T;
  priority: number;
}

export class MinPriorityQueue<T> {
  private heap: PriorityItem<T>[] = [];

  constructor(items: PriorityItem<T>[] = []) {
    for (const item of items) {
      this.enqueue(item.value, item.priority);
    }
  }

  public get size(): number {
    return this.heap.length;
  }

  public isEmpty(): boolean {
    return this.heap.length === 0;
  }

  public enqueue(value: T, priority: number): void {
    const item: PriorityItem<T> = { value, priority };
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  public dequeue(): T | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop()!.value;

    const min = this.heap[0].value;
    this.heap[0] = this.heap.pop()!;
    this.sinkDown(0);
    return min;
  }

  public peek(): T | undefined {
    return this.heap.length > 0 ? this.heap[0].value : undefined;
  }

  public clear(): void {
    this.heap = [];
  }

  private bubbleUp(index: number): void {
    const item = this.heap[index];
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIdx];
      if (item.priority >= parent.priority) break;
      this.heap[index] = parent;
      index = parentIdx;
    }
    this.heap[index] = item;
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;
    const item = this.heap[index];

    while (true) {
      const leftChildIdx = 2 * index + 1;
      const rightChildIdx = 2 * index + 2;
      let swapIdx: number | null = null;
      let minPriority = item.priority;

      if (leftChildIdx < length) {
        if (this.heap[leftChildIdx].priority < minPriority) {
          minPriority = this.heap[leftChildIdx].priority;
          swapIdx = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        if (this.heap[rightChildIdx].priority < minPriority) {
          swapIdx = rightChildIdx;
        }
      }

      if (swapIdx === null) break;

      this.heap[index] = this.heap[swapIdx];
      index = swapIdx;
    }

    this.heap[index] = item;
  }
}
