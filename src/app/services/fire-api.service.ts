import { Injectable } from '@angular/core';
import { AngularFirestore, DocumentChangeAction } from '@angular/fire/compat/firestore';
import { MemoFile } from '@models/memo-file.model';
import { Observable, from, map, take } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class FireApiService {
  readonly memoFilesCollection: string = 'memoFiles';
  readonly usersCollection: string = 'users';

  constructor(private afs: AngularFirestore) {}

  documentToItem<T>(docAction: DocumentChangeAction<T>): T {
    const data = docAction.payload.doc.data();
    const id = docAction.payload.doc.id;

    return {
      id,
      ...data,
    };
  }

  getUser(userId: string): Observable<User> {
    return this.afs
      .doc<User>(`${this.usersCollection}/${userId}`)
      .valueChanges()
      .pipe(
        take(1),
        map((user) => ({ ...user, id: userId }))
      );
  }

  getMemoFiles(userId: string): Observable<MemoFile[]> {
    return this.afs
      .collection<MemoFile>(this.memoFilesCollection, (ref) => ref.where('userId', '==', userId))
      .snapshotChanges()
      .pipe(
        take(1),
        map((items) => items.map((docAction) => this.documentToItem<MemoFile>(docAction)))
      );
  }

  createMemoFile(memoFile: Partial<MemoFile>): Observable<MemoFile> {
    return from(
      this.afs.collection<Partial<MemoFile>>(this.memoFilesCollection).add(memoFile)
    ).pipe(map((res) => ({ ...memoFile, id: res.id } as MemoFile)));
  }

  updateMemoFile(memoFile: Partial<MemoFile>): Observable<MemoFile> {
    return from(
      this.afs
        .collection<Partial<MemoFile>>(this.memoFilesCollection)
        .doc(memoFile.id)
        .set(memoFile)
    ).pipe(map(() => ({ ...memoFile } as MemoFile)));
  }

  updateUser(userId: string, changes: Partial<User>): Observable<Partial<User>> {
    return from(
      this.afs.collection<Partial<User>>(this.usersCollection).doc(userId).set(changes)
    ).pipe(map(() => ({ ...changes } as Partial<User>)));
  }

  deleteMemoFile(memoFileId: string): Observable<void> {
    return from(this.afs.doc<User>(`${this.memoFilesCollection}/${memoFileId}`).delete());
  }
}
