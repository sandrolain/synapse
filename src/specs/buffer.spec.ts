/**
 * @jest-environment jsdom
 */

import { Emitter } from "../index";
import { emitterReleaser, ReleaseExecutionFunction } from "../releasers";

describe("emitter.buffer()", () => {

  it("emitter.buffer() with emitterReleaser()", done => {
    const emitter = new Emitter<number>();
    const releaser = new Emitter();

    let latestData: number[] = null;

    emitter.buffer(emitterReleaser(releaser)).subscribe(data => {
      latestData = data;
    });

    emitter.emit(4);
    emitter.emit(8);
    emitter.emit(15);
    emitter.emit(16);

    expect(latestData).toBeNull();

    releaser.emit();

    expect(latestData).toMatchObject([4, 8, 15, 16]);
    done();
  });

  it("emitter.buffer() with custom releaser", done => {
    const emitter = new Emitter<number>();
    const releaser = (buffer: number[], release: ReleaseExecutionFunction): void => {
      if((buffer.includes(16))) {
        release(buffer);
      }
    };

    emitter.buffer(releaser).subscribe(data => {
      expect(data).toMatchObject([4, 8, 15, 16]);
      done();
    });

    emitter.emit(4);
    emitter.emit(8);
    emitter.emit(15);
    emitter.emit(16);
  });

});
