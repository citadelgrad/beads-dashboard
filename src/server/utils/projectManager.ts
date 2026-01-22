/**
 * ProjectManager - Manages the current active project for the dashboard
 * This allows switching between different beads projects at runtime
 */
export class ProjectManager {
  private currentProjectRoot: string;

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
    this.currentProjectRoot = newProjectRoot;
  }
}
