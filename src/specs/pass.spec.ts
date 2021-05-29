/**
 * @jest-environment jsdom
 */

import { Emitter } from "../index";
import { timeoutReleaser, emitterReleaser } from "../releasers";

describe("emitter.pass()", () => {

  it("emitter.pass() with emitterReleaser()", done => {
    const emitterA = new Emitter();
    const releaser = new Emitter();

    emitterA.pass(emitterReleaser(releaser)).subscribe(data => {
      expect(data).toMatchObject({ foo: "bar" });
      done();
    });

    emitterA.emit({
      foo: "foo"
    });

    releaser.emit();

    emitterA.emit({
      foo: "bar"
    });
  });

  it("emitter.pass() with timeoutReleaser()", done => {
    const emitterA = new Emitter();

    emitterA.pass(timeoutReleaser(200)).subscribe(data => {
      expect(data).toMatchObject({ foo: "bar" });
      done();
    });

    emitterA.emit({
      foo: "foo"
    });

    setTimeout(() => {
      emitterA.emit({
        foo: "bar"
      });
    }, 300);
  });

});
