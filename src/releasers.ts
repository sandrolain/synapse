import { Emitter } from "./index";

export type ReleaseExecutionFunction<T=any> = (data: T) => void;
export type ReleaseFunction<T=any> = (data: T, release: ReleaseExecutionFunction) => void;


// TODO: docs
// TODO: test
export function emitterReleaser<T=any> (emitter: Emitter): ReleaseFunction<any> {
  let releaserFunction: () => void;
  emitter.subscribe(() => {
    if(releaserFunction) {
      releaserFunction();
    }
  });
  return (data: T, releaser: ReleaseExecutionFunction<T>): void => {
    releaserFunction = (): void => {
      releaser(data);
    };
  };
}

// TODO: docs
// TODO: test
export function delayReleaser<T=any> (time: number): ReleaseFunction<any> {
  return (data: T, releaser: ReleaseExecutionFunction<T>): void => {
    window.setTimeout(() => releaser(data), time);
  };
}

// TODO: docs
// TODO: test
export function debounceReleaser<T=any> (time: number): ReleaseFunction<any> {
  let emitterTO: number;
  return (data: T, releaser: ReleaseExecutionFunction<T>): void => {
    if(emitterTO) {
      window.clearTimeout(emitterTO);
    }
    emitterTO = window.setTimeout(() => releaser(data), time);
  };
}

// TODO: docs
// TODO: test
export function timeoutReleaser<T=any> (time: number): ReleaseFunction<any> {
  let emitterTO: number = null;
  return (data: T, releaser: ReleaseExecutionFunction<T>): void => {
    if(emitterTO === null) {
      emitterTO = window.setTimeout(() => {
        emitterTO = null;
        releaser(data);
      }, time);
    }
  };
}


// TODO: docs
// TODO: test
export function countReleaser<T=any> (max: number, start: number = 0): ReleaseFunction<any> {
  let count: number = start;
  return (data: T, releaser: ReleaseExecutionFunction<T>): void => {
    if(++count >= max) {
      count = start;
      releaser(data);
    }
  };
}


// TODO: docs
// TODO: test
export function lengthReleaser<T=any> (max: number): ReleaseFunction<any> {
  return (data: T[], releaser: ReleaseExecutionFunction<T[]>): void => {
    if(data.length === max) {
      releaser(data);
    }
  };
}
