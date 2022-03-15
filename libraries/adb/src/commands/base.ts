import { AutoDisposable } from '@yume-chan/event';
import type { Adb } from '../adb';

export class AdbCommandBase extends AutoDisposable {
    protected adb: Adb;

    public constructor(adb: Adb) {
        super();
        this.adb = adb;
    }
}
