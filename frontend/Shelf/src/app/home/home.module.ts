import { NgModule } from '@angular/core';
import { HomeComponent } from './home/home.component';
import { AppRoutingModule } from "../app-routing.module";
import { CommonModule } from "@angular/common";
import { DetailedGameComponent } from '../detailed-game/detailed-game.component';
import { BrowserModule } from '@angular/platform-browser';
import { RatingModule } from 'primeng/rating';
import { FormsModule } from "@angular/forms";
import { GameOverviewModule } from "../game-overview/game-overview.module";
import { NavModule } from '../nav/nav.module';
import { SearchPipe } from "./home/search.pipe";
import { DropdownModule } from 'primeng/dropdown';
import { UserOverviewComponent } from '../user-overview/user-overview.component';

@NgModule({
  declarations: [
    HomeComponent,
    DetailedGameComponent,
    SearchPipe,
    UserOverviewComponent
  ],
  imports: [
    AppRoutingModule,
    CommonModule,
    FormsModule,
    BrowserModule,
    RatingModule,
    GameOverviewModule,
    NavModule,
    DropdownModule
  ]
})
export class HomeModule { }
