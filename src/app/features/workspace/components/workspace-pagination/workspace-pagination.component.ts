import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { DEDUCTION_COEFFICIENT, ROWS_PER_PAGE, START_ROW_INDEX } from '@app/constants';
import { MemoService } from '@app/services/memo.service';
import { MemoRowFacade } from '@app/store/memo-row';
import { MemoRow } from '@models/index';
import { BehaviorSubject, Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

interface PaginationForm {
  from: FormControl<number>;
  to: FormControl<number>;
  checkAllPages: FormControl<boolean>;
  withFlag: FormControl<boolean>;
  pages: FormArray<FormControl<boolean>>;
}

@Component({
  selector: 'dsr-workspace-pagination',
  templateUrl: './workspace-pagination.component.html',
  styleUrls: ['./workspace-pagination.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspacePaginationComponent implements OnInit, OnChanges, OnDestroy {
  @Input() rowsTotalCount: number;
  @Input() rowsLeftCount: number;
  @Input() currentMemoRowId: number;
  @Input() memoRows: MemoRow[];

  DEDUCTION_COEFFICIENT = DEDUCTION_COEFFICIENT;
  fromRowNumber$: BehaviorSubject<number> = new BehaviorSubject(1);
  toRowNumber$: BehaviorSubject<number> = new BehaviorSubject(1);

  private onDestroy$: Subject<void> = new Subject();
  private readonly numbersValidation = Validators.pattern('^[0-9]*$');

  form = this.fb.group<PaginationForm>({
    from: this.fb.control<number>(START_ROW_INDEX, [Validators.required, this.numbersValidation]),
    to: this.fb.control<number>(START_ROW_INDEX, [Validators.required, this.numbersValidation]),
    pages: this.fb.array<FormControl<boolean>>([]),
    checkAllPages: this.fb.control<boolean>(false),
    withFlag: this.fb.control<boolean>(false),
  });

  constructor(
    private fb: FormBuilder,
    private memoService: MemoService,
    private memoRowFacade: MemoRowFacade
  ) {}

  ngOnInit(): void {
    this.watchFormChanges();
    this.watchAllPagesCheckboxChanges();
    this.watchPagesChanges();
    this.watchFlagChanges();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!!changes['rowsTotalCount']) {
      this.initPages();

      if (this.rowsTotalCount > 0) {
        if (this.form.controls.withFlag.value) {
          this.form.controls.withFlag.updateValueAndValidity();
        } else {
          this.form.controls.pages.updateValueAndValidity();
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  initPages(): void {
    this.form.controls.pages.clear({ emitEvent: false });

    for (let i = 0; i < this.pagesCount; i++) {
      this.form.controls.pages.push(this.fb.control<boolean>(true), { emitEvent: false });
    }
  }

  watchPagesChanges(): void {
    this.form.controls.pages.valueChanges.pipe(takeUntil(this.onDestroy$)).subscribe((pages) => {
      const isAllPagesChecked = pages.every((item) => item === true);
      const selectedPages = this.memoService.getSelectedPages(pages);

      this.form.controls.checkAllPages.patchValue(isAllPagesChecked, { emitEvent: false });

      if (selectedPages.length) {
        const boundaryIndexes = this.memoService.getBoundaryRowsIndexes(
          selectedPages,
          this.rowsTotalCount,
          ROWS_PER_PAGE
        );

        const fromRowNumber = boundaryIndexes.firstRowIndex + 1;
        const toRowNumber = boundaryIndexes.lastRowIndex + 1;
        const rowsLimitValidation = [Validators.min(fromRowNumber), Validators.max(toRowNumber)];

        this.form.patchValue(
          { from: fromRowNumber, to: toRowNumber },
          {
            emitEvent: false,
          }
        );

        this.fromRowNumber$.next(fromRowNumber);
        this.toRowNumber$.next(toRowNumber);

        this.form.controls.from.setValidators(rowsLimitValidation);
        this.form.controls.to.setValidators(rowsLimitValidation);
      }
    });
  }

  watchFlagChanges(): void {
    this.form.controls.withFlag.valueChanges
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((withFlag) => {
        if (withFlag) {
          const flaggedMemoRowIds = this.memoRows
            .filter((memoRow) => !!memoRow.flag)
            .map((memoRow) => memoRow.id);

          const pagesWithRows = this.memoService.getPagesWithRows(
            this.memoService.getSelectedPages(this.form.controls.pages.value),
            flaggedMemoRowIds,
            ROWS_PER_PAGE
          );

          this.form.controls.pages.clear({ emitEvent: false });

          for (let i = 0; i < this.pagesCount; i++) {
            this.form.controls.pages.push(
              this.fb.control<boolean>(pagesWithRows.indexOf(i) !== -1),
              {
                emitEvent: false,
              }
            );
          }

          this.form.controls.pages.updateValueAndValidity();
        }
      });
  }

  watchFormChanges(): void {
    this.form.valueChanges
      .pipe(debounceTime(100), distinctUntilChanged(), takeUntil(this.onDestroy$))
      .subscribe((formValue) => {
        const selectedRowsIndexes = this.memoService.getSelectedRowsIndexes(
          this.memoService.getSelectedPages(formValue.pages),
          formValue.from - 1,
          formValue.to - 1,
          ROWS_PER_PAGE
        );

        this.memoRowFacade.setSelection(selectedRowsIndexes, formValue.withFlag);
      });
  }

  watchAllPagesCheckboxChanges(): void {
    this.form.controls.checkAllPages.valueChanges
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((checkAllPages) => {
        this.form.controls.pages.patchValue(new Array(this.pagesCount).fill(checkAllPages));
      });
  }

  get pagesCount(): number {
    return this.rowsTotalCount < ROWS_PER_PAGE ? 1 : Math.ceil(this.rowsTotalCount / ROWS_PER_PAGE);
  }

  addUpRows(): void {
    this.form.patchValue({
      from: this.form.controls.from.value + DEDUCTION_COEFFICIENT,
    });
  }

  deductRows(): void {
    this.form.patchValue({
      to: this.form.controls.to.value - DEDUCTION_COEFFICIENT,
    });
  }
}
