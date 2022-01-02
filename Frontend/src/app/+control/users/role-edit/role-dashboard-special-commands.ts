import {PermissionName, UserRole} from "../../../shared/modules/api/oeda-api.service";
import {
  CheckedAllCommand,
  CheckedCommand, Command,
  DisableAllButton,
  DisableButton,
  EnableAllButton,
  EnableButton,
  PermissionButton
} from "./role-dashboard-models";

export class CommandFactory {

  static createButtonCommand(permissionName: PermissionName, table: Map<PermissionName, PermissionButton>): Command {
    switch (permissionName) {
      case PermissionName.GET_TARGETSYSTEM:
        return new GetTargetSystemCheckedCommand(permissionName, table);
      case PermissionName.WRITE_TARGETSYSTEM:
      case PermissionName.DEL_TARGETSYSTEM:
        return new TargetSystemCheckedCommand(permissionName, table);
      case PermissionName.GET_EXPERIMENT:
        return new GetExperimentCheckedCommand(permissionName, table);
      case PermissionName.WRITE_EXPERIMENT:
        return new WriteExperimentCheckedCommand(permissionName, table);
      case PermissionName.DEL_EXPERIMENT:
        return new DeleteExperimentCheckedCommand(permissionName, table);
      default:
        return new CheckedCommand(permissionName, table);
    }
  }

  static createAllButtonCommand(permissionName: PermissionName, table: Map<PermissionName, PermissionButton>): Command {
    switch (permissionName) {
      case PermissionName.GET_TARGETSYSTEM:
        return new GetTargetSystemCheckedAllCommand(permissionName, table);
      case PermissionName.GET_EXPERIMENT:
        return new GetExperimentCheckedAllCommand(permissionName, table);
      default:
        return new CheckedAllCommand(permissionName, table);
    }
  }
}

export class LoadPermissionsCommand implements Command {

  table: Map<PermissionName, PermissionButton>;
  selectedRole: UserRole;

  constructor(selectedRole: UserRole, table: Map<PermissionName, PermissionButton>) {
    this.table = table;
    this.selectedRole = selectedRole;
  }

  execute(): void {
    this.table.forEach((permissionBtn) => {
      permissionBtn.checked = false;
      permissionBtn.access_all_checked = false;
      permissionBtn.disabled = false;
      permissionBtn.access_all_disabled = true;
    })
    this.table.forEach((permissionBtn) => {
      const permission = this.selectedRole.permissions.find((permission_) => permissionBtn.name === permission_.name);
      // Reverse value as Command cause a click event changing the value back
      if (permission) {
        permissionBtn.checked = false;
        permissionBtn.access_all_checked = !permission.access_all;
      } else {
        permissionBtn.checked = true;
      }
      const command = CommandFactory.createButtonCommand(permissionBtn.name, this.table);
      command.execute();
      if (permission) {
        const commandAll = CommandFactory.createAllButtonCommand(permissionBtn.name, this.table);
        commandAll.execute();
      }
    })
  }

  redo(): void {
  }

  undo(): void {
  }

}

export class GetTargetSystemCheckedCommand extends CheckedCommand {

  protected execute_checked(): void {
    this.addCommand(new EnableButton(PermissionName.WRITE_TARGETSYSTEM, this.table));
    this.addCommand(new EnableButton(PermissionName.DEL_TARGETSYSTEM, this.table));
    this.addCommand(new EnableButton(PermissionName.GET_EXPERIMENT, this.table));
  }

  protected execute_unchecked(): void {
    this.addCommand(new DisableButton(PermissionName.WRITE_TARGETSYSTEM, this.table));
    this.addCommand(new DisableButton(PermissionName.DEL_TARGETSYSTEM, this.table));
    this.addCommand(new DisableButton(PermissionName.GET_EXPERIMENT, this.table));
    this.addCommand(new DisableButton(PermissionName.WRITE_EXPERIMENT, this.table));
    this.addCommand(new DisableButton(PermissionName.DEL_EXPERIMENT, this.table));
    this.addCommand(new DisableButton(PermissionName.WRITE_DATASTORAGE, this.table));
  }
}

export class TargetSystemCheckedCommand extends CheckedCommand {

  protected canActivateAll(): boolean {
    return this.table.get(PermissionName.GET_TARGETSYSTEM).is_all_active();
  }
}

export class GetExperimentCheckedCommand extends CheckedCommand {
  protected execute_checked(): void {
    this.addCommand(new EnableButton(PermissionName.WRITE_EXPERIMENT, this.table));
    this.addCommand(new EnableButton(PermissionName.DEL_EXPERIMENT, this.table));
  }

  protected execute_unchecked(): void {
    this.addCommand(new DisableButton(PermissionName.WRITE_EXPERIMENT, this.table));
    this.addCommand(new DisableButton(PermissionName.DEL_EXPERIMENT, this.table));
  }

  protected canActivateAll(): boolean {
    return this.table.get(PermissionName.GET_TARGETSYSTEM).is_all_active();
  }
}

export class WriteExperimentCheckedCommand extends CheckedCommand {
  protected execute_checked(): void {
    this.addCommand(new EnableButton(PermissionName.WRITE_DATASTORAGE, this.table));
  }
  protected execute_unchecked(): void {
    this.addCommand(new DisableButton(PermissionName.WRITE_DATASTORAGE, this.table));
  }
  protected canActivateAll(): boolean {
    return this.table.get(PermissionName.GET_EXPERIMENT).is_all_active() && this.table.get(PermissionName.GET_TARGETSYSTEM).is_all_active();
  }
}

export class DeleteExperimentCheckedCommand extends CheckedCommand {

  protected canActivateAll(): boolean {
    return this.table.get(PermissionName.GET_EXPERIMENT).is_all_active() && this.table.get(PermissionName.GET_TARGETSYSTEM).is_all_active();
  }
}




export class GetTargetSystemCheckedAllCommand extends CheckedAllCommand {
  protected execute_checked(): void {
    this.addCommand(new EnableAllButton(PermissionName.WRITE_TARGETSYSTEM, this.table));
    this.addCommand(new EnableAllButton(PermissionName.DEL_TARGETSYSTEM, this.table));
    this.addCommand(new EnableAllButton(PermissionName.GET_EXPERIMENT, this.table));
  }

  protected execute_unchecked(): void {
    this.addCommand(new DisableAllButton(PermissionName.WRITE_TARGETSYSTEM, this.table));
    this.addCommand(new DisableAllButton(PermissionName.DEL_TARGETSYSTEM, this.table));
    this.addCommand(new DisableAllButton(PermissionName.GET_EXPERIMENT, this.table));
    this.addCommand(new DisableAllButton(PermissionName.WRITE_EXPERIMENT, this.table));
    this.addCommand(new DisableAllButton(PermissionName.DEL_EXPERIMENT, this.table));
  }
}

export class GetExperimentCheckedAllCommand extends CheckedAllCommand {
  protected execute_checked(): void {
    this.addCommand(new EnableAllButton(PermissionName.WRITE_EXPERIMENT, this.table));
    this.addCommand(new EnableAllButton(PermissionName.DEL_EXPERIMENT, this.table));
  }

  protected execute_unchecked(): void {
    this.addCommand(new DisableAllButton(PermissionName.WRITE_EXPERIMENT, this.table));
    this.addCommand(new DisableAllButton(PermissionName.DEL_EXPERIMENT, this.table));
  }
}
