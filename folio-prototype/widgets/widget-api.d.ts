/** Folio Widget API v1 — trusted, reviewed, bundled JavaScript only. */
type FolioDataset = 'courses' | 'tasks' | 'exams' | 'academic' | 'focus' | 'study';
type FolioDestination = 'home' | 'workbench' | 'calendar' | 'courses' | 'homework' | 'todos' | 'goals' | 'grades' | 'scholar' | 'focus';
interface FolioWidgetContext {
 readonly apiVersion: 1; readonly id: string; readonly preview: boolean;
 readonly dataMode: 'local' | 'demo'; readonly timezone: 'Asia/Shanghai'; readonly today: string;
 /** Courses after holidays, exchanges and recoverable local exclusions. Requires courses permission. */
 coursesOn(date: string, termId?: string): ReadonlyArray<Readonly<{id:string;courseId:string;title:string;date:string;start:string;end:string;room?:string;periods?:number;personal?:boolean;itemId?:string}>>;
 read<T = unknown>(dataset: FolioDataset): Readonly<T>;
 subscribe<T = unknown>(dataset: FolioDataset, callback: (data: Readonly<T>) => void): () => void;
 onDispose(callback: () => void): () => void;
 preferences: {get<T>(key: string, fallback?: T): T; set(key: string, value: unknown): void};
 open(destination: FolioDestination): boolean;
}
interface FolioWidget {
 apiVersion: 1; id: string; version: string; name: string; description?: string;
 permissions: FolioDataset[];
 mount(root: HTMLElement, context: FolioWidgetContext): void | (() => void) | {destroy(): void};
 preview?(root: HTMLElement, context: FolioWidgetContext): void | (() => void) | {destroy(): void};
}
declare const FolioWidgetSDK: {
 readonly apiVersion: 1; readonly datasets: readonly FolioDataset[];
 register(widget: FolioWidget): void;
 list(): Pick<FolioWidget, 'apiVersion' | 'id' | 'version' | 'name' | 'permissions'>[];
 loadBundled(entries: {id: string; script: string}[]): Promise<void>;
};
