import { Injectable } from '@angular/core';
import { AuthCredentials, User } from '@app/models';
import * as fromActions from '@app/store/user/user.actions';
import * as fromReducer from '@app/store/user/user.reducer';
import * as fromSelectors from '@app/store/user/user.selectors';
import { Store, select } from '@ngrx/store';

@Injectable({
  providedIn: 'root',
})
export class UserFacade {
  constructor(private store: Store<fromReducer.UserState>) {}

  userState$ = this.store.pipe(select(fromSelectors.selectState()));
  isLoading$ = this.store.pipe(select(fromSelectors.selectIsLoading()));
  isAuthorized$ = this.store.pipe(select(fromSelectors.selectIsAuthorized()));
  isInitialized$ = this.store.pipe(select(fromSelectors.selectIsInitialized()));
  user$ = this.store.pipe(select(fromSelectors.selectUser()));
  activeMemoFileId$ = this.store.pipe(select(fromSelectors.selectActiveMemoFileId()));
  isTranslationByDefault$ = this.store.pipe(select(fromSelectors.selectIsTranslationByDefault()));
  isDemo$ = this.store.pipe(select(fromSelectors.selectIsDemo()));
  error$ = this.store.pipe(select(fromSelectors.selectError()));
  userId: string = null;

  initAuth(): void {
    this.store.dispatch(fromActions.initAuth());
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  eraseUserId(): void {
    this.userId = null;
  }

  signIn(credentials: AuthCredentials): void {
    this.store.dispatch(fromActions.signIn({ credentials }));
  }

  signOut(): void {
    this.store.dispatch(fromActions.signOut());
  }

  setActiveMemoFileId(memoFileId: string): void {
    this.store.dispatch(fromActions.setActiveMemoFileId({ id: memoFileId }));
  }

  updateSettings(changes: Partial<User>): void {
    this.store.dispatch(fromActions.updateSettings({ payload: { id: this.userId, changes } }));
  }
}
