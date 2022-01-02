import {Component, Input, OnInit} from "@angular/core";
import {PermissionName} from "../api/oeda-api.service";
import {Invoker, PermissionButton} from "../../../+control/users/role-edit/role-dashboard-models";
import {
  CommandFactory,
} from "../../../+control/users/role-edit/role-dashboard-special-commands";

@Component({
  selector: 'permissions-button',
  template: `<div class="align-center">
    <div class="col-xs-6"><input type="checkbox" class="form-check-input" [disabled]="permissionBtn.disabled"
                                 [checked]="permissionBtn.checked" (click)="setCheckedCommand()"></div>
    <div class="col-xs-6">
      <ui-switch *ngIf="!hideAccessAll" size="small" (click)="setCheckedAllCommand()" [disabled]="permissionBtn.access_all_disabled"
                 [checked]="permissionBtn.access_all_checked"></ui-switch>
    </div>
  </div>

  `
})

export class PermissionButtonComponent implements OnInit {

  @Input() invoker: Invoker;
  @Input() table: Map<PermissionName, PermissionButton>;
  @Input() permissionName;

  @Input()
  hideAccessAll = false;

  permissionBtn: PermissionButton;

  constructor() {

  }

  ngOnInit() {
    this.permissionBtn = this.table.get(this.permissionName);
  }

  setCheckedCommand(): void {
    if (!this.permissionBtn.is_disabled()) {
      const command = CommandFactory.createButtonCommand(this.permissionName, this.table);
      this.invoker.setCommand(command);
    }

  }

  setCheckedAllCommand(): void {

    if (!this.permissionBtn.is_all_disabled()) {
    const command = CommandFactory.createAllButtonCommand(this.permissionName, this.table);
      this.invoker.setCommand(command);
    }

  }





}
