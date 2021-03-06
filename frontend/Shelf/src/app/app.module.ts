import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './auth/auth.interceptor';
import { LoginModule } from './login/login.module';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { HomeModule } from './home/home.module';
import { ToastModule } from 'primeng/toast';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProfileModule } from './profile/profile.module';
import { InboxModule } from './inbox/inbox.module';
import { NavModule } from './nav/nav.module';
import { GameOverviewModule } from './game-overview/game-overview.module';
import { BasicGameOverviewModule } from './basic-game-overview/basic-game-overview.module';
import { SettingsModule } from './settings/settings.module';
import { SearchModule } from './search/search.module';
import { FindUsersModule } from './find-users/find-users.module';
import { UserOverviewModule } from './user-overview/user-overview.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { FeedModule } from './feed/feed.module';
import { MessageModule } from './message/message.module';

@NgModule({
  declarations: [
    AppComponent,
    PageNotFoundComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    RouterModule,
    HttpClientModule,
    AppRoutingModule,
    LoginModule,
    HomeModule,
    NavModule,
    ToastModule,
    FormsModule,
    ReactiveFormsModule,
    ProfileModule,
    InboxModule,
    GameOverviewModule,
    SettingsModule,
    SearchModule,
    FindUsersModule,
    UserOverviewModule,
    LeaderboardModule,
    FeedModule,
    MessageModule,
    BasicGameOverviewModule
  ],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }],
  bootstrap: [AppComponent]
})
export class AppModule { }
