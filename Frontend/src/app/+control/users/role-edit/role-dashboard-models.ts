import {PermissionName, UserRole} from "../../../shared/modules/api/oeda-api.service";

export class PermissionButton {
  permissionId: number;
  name: PermissionName;
  checked = false;
  disabled = false;
  access_all_checked = false;
  access_all_disabled = false;

  constructor(permissionId: number, name: PermissionName) {
    this.permissionId = permissionId,
    this.name = name;
  }

  copy(): PermissionButton {
    const copyBtn = new PermissionButton(this.permissionId, this.name);
    copyBtn.checked = this.checked;
    copyBtn.access_all_checked = this.access_all_checked;
    copyBtn.disabled = this.disabled;
    copyBtn.access_all_disabled = this.access_all_disabled;
    return copyBtn;
  }

  setState(other: PermissionButton): void {
    this.checked = other.checked;
    this.access_all_checked = other.access_all_checked;
    this.disabled = other.disabled;
    this.access_all_disabled = other.access_all_disabled;
  }

  getPermissionId(): number {
    return this.permissionId;
  }

  is_active(): boolean {
    return this.checked;
  }

  is_all_active(): boolean {
    return this.access_all_checked;
  }

  is_disabled(): boolean {
    return this.disabled;
  }

  is_all_disabled(): boolean {
    return this.access_all_disabled;
  }
}

export class Invoker {

  history = new Array<Command>();
  redoHistory = new Array<Command>();

  setCommand(command: Command) {
    this.redoHistory = new Array<Command>()
    this.history.push(command);
    command.execute();
  }

  undo(): void {
    const command = this.history.pop();
    this.redoHistory.push(command);
    command.undo();
  }

  isHistoryEmpty(): boolean {
    return this.history.length === 0;
  }

  isRedoHistoryEmpty(): boolean {
    return this.redoHistory.length === 0;
  }

  redo(): void {
    const command = this.redoHistory.pop();
    this.history.push(command);
    command.redo();
  }

  clear(): void {
    this.history = new Array<Command>();
    this.redoHistory = new Array<Command>();
  }
}

export interface Command {
  execute(): void;

  undo(): void;

  redo(): void;
}

export abstract class BasicButtonCommand implements Command {

  protected table: Map<PermissionName, PermissionButton>;
  protected permissionBtn: PermissionButton;
  private permissionBtnLast: PermissionButton;
  private additionalCommands = new Array<Command>();

  constructor(permission: PermissionName, table: Map<PermissionName, PermissionButton>) {
    this.permissionBtn = table.get(permission);
    this.table = table;
  }

  protected abstract execute_impl(): void;

  execute(): void {
    this.permissionBtnLast = this.permissionBtn.copy();
    this.additionalCommands = new Array<Command>();
    this.execute_impl();
    this.additionalCommands.forEach((command) => command.execute());
  }

  redo(): void {
    this.execute();
  }

  undo(): void {
    this.permissionBtn.setState(this.permissionBtnLast);
    this.additionalCommands.forEach((command) => command.undo());
  }

  addCommand(command: Command): void {
    this.additionalCommands.push(command);
  }

}

export class CheckedCommand extends BasicButtonCommand {


  protected execute_impl(): void {
    this.permissionBtn.checked = !this.permissionBtn.checked;
    if (this.permissionBtn.checked) {
      this.permissionBtn.access_all_disabled = !this.canActivateAll();
      this.execute_checked();
    } else {
      this.permissionBtn.access_all_checked = false;
      this.permissionBtn.access_all_disabled = true;
      this.execute_unchecked();
    }
  }

  protected execute_checked(): void {
  }

  protected execute_unchecked(): void {
  }

  protected canActivateAll() {
    return true;
  }
}

export class CheckedAllCommand extends BasicButtonCommand {

  protected execute_impl(): void {
    this.permissionBtn.access_all_checked = !this.permissionBtn.access_all_checked;
    if (this.permissionBtn.access_all_checked) {
      this.execute_checked();
    } else {
      this.execute_unchecked();
    }
  }

  protected execute_checked(): void {
  }

  protected execute_unchecked(): void {
  }

}

export class DisableButton extends BasicButtonCommand {
  protected execute_impl(): void {
    this.permissionBtn.checked = false;
    this.permissionBtn.disabled = true;
    this.permissionBtn.access_all_disabled = true;
    this.permissionBtn.access_all_checked = false;
  }
}

export class EnableButton extends BasicButtonCommand {
  protected execute_impl(): void {
    this.permissionBtn.disabled = false;
    this.permissionBtn.access_all_disabled = !this.permissionBtn.checked;
  }
}

export class DisableAllButton extends BasicButtonCommand {
  protected execute_impl(): void {
    this.permissionBtn.access_all_disabled = true;
    this.permissionBtn.access_all_checked = false;
  }
}

export class EnableAllButton extends BasicButtonCommand {
  protected execute_impl(): void {
    this.permissionBtn.access_all_disabled = !this.permissionBtn.checked;
  }
}

export class DescriptionChanged implements Command {

  newText: string;
  oldText: string;
  role: UserRole;

  constructor(role: UserRole, newText: string) {
    this.newText = newText;
    this.oldText = role.description;
    this.role = role;
  }
  execute(): void {
    // Input field already up to date by standard event
  }

  redo(): void {
    this.role.description = this.newText;
  }

  undo(): void {
    this.role.description = this.oldText;
  }

}





