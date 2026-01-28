/**
 * ProjectManager - Manages the current active project for the dashboard
 * This allows switching between different beads projects at runtime
 */
export class ProjectManager {
  private currentProjectRoot: string;
  private onChangeCallback: ((newPath: string) => void) | null = null;

  constructor(initialProjectRoot: string) {
    this.currentProjectRoot = initialProjectRoot;
  }

  /**
   * Get the current project root directory
   */
  getProjectRoot(): string {
    return this.currentProjectRoot;
  }

  /**
   * Set a new project root directory
   * @param newProjectRoot - Path to the new project
   */
  setProjectRoot(newProjectRoot: string): void {
    const oldProjectRoot = this.currentProjectRoot;
    this.currentProjectRoot = newProjectRoot;

    // Notify listeners if project actually changed
    if (oldProjectRoot !== newProjectRoot && this.onChangeCallback) {
      this.onChangeCallback(newProjectRoot);
    }
  }

  /**
   * Register a callback to be called when project changes
   * @param callback - Function to call with new project path
   */
  onProjectChange(callback: (newPath: string) => void): void {
    this.onChangeCallback = callback;
  }
}
