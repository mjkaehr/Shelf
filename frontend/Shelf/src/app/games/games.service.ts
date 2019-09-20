import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import { Router } from '@angular/router';
import {Observable} from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import {HOME_PAGE} from '../constants/constants.pages';
import {GameModel} from './game.model';

@Injectable({
  providedIn: 'root'
})
export class GamesService {

  constructor(private http: HttpClient, private router: Router) { }

  // BEN TODO: MAKE THESE URLS CONSTANTS
  getDashboardGames(): Observable<any> {
    return this.http.get('http://localhost:8080/games/allgames');
  }

  // BEN TODO: MAKE THESE URLS CONSTANTS
  getDetailedInfoAboutGame(id): Observable<any> {
    return this.http.post<object>('http://localhost:8080/games/detailedgamedata', {
      id
    });
  }


  getRatingInfo(id: string): Observable<any> {
    return this.http.get<GameModel>('http://localhost:8080/ratingInfo/' + id);

  }

  toHomePage() {
    this.router.navigate([HOME_PAGE]);
  }

  submitRating(rating: number, id: string): Observable<any> {
    console.log('CALLING SUBMIT');
    return this.http.post<object>('http://localhost:8080/ratingInfo/' + id, {
      rating
    });
  }

  // removeRating(id: string): Observable<any> {
  //   this.submitRating(0,id)
  // }
}
