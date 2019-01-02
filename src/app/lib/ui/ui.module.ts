/*****************************
 * User Interface components
 *****************************/

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatIconModule, MatButtonModule, MatTooltipModule,
        MatFormFieldModule, MatInputModule, MatSelectModule, MatCardModule,
        MatDatepickerModule, MatNativeDateModule } from '@angular/material';

// ** components **
import { MsgBox, AlertDialog, ConfirmDialog, AboutDialog, LoginDialog } from './dialogs';
import { FileInputComponent } from './file-input.component';
import { PopoverComponent } from './popover';
import { TextDialComponent } from './dial-text';
import { ResourceDialog } from './resource-dialogs';
import { PlaybackDialog } from './playback-dialog';

import { GeometryCircleComponent } from '../components/geom-circle.component';
import { AisTargetsComponent } from '../components/feature-ais.component';

@NgModule({
    imports: [
        CommonModule, FormsModule, MatTooltipModule,
        MatDialogModule, MatIconModule, MatButtonModule,
        MatFormFieldModule, MatInputModule, MatSelectModule,
        MatDatepickerModule, MatNativeDateModule, MatCardModule
      ],    
    declarations: [
        MsgBox, AlertDialog, ConfirmDialog, AboutDialog,
        FileInputComponent, TextDialComponent, LoginDialog,
        PopoverComponent, ResourceDialog, PlaybackDialog,
        GeometryCircleComponent, AisTargetsComponent
    ],
    exports: [
        MsgBox, AlertDialog, ConfirmDialog, AboutDialog,
        FileInputComponent, TextDialComponent, LoginDialog,
        PopoverComponent, ResourceDialog, PlaybackDialog,
        GeometryCircleComponent, AisTargetsComponent
    ],
    entryComponents: [
        MsgBox, AlertDialog, ConfirmDialog, AboutDialog,
        ResourceDialog, PlaybackDialog, LoginDialog
    ], 
    providers: []  
})
export class AppUIModule {}

