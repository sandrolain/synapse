export type ReleaseExecutionFunction = () => void;
export type ReleaseFunction<T=any> = (data: T, release: ReleaseExecutionFunction) => void;

// TODO: docs
// TODO: test
export function timeoutReleaser<T=any> (time: number): ReleaseFunction<any> {
  let emitterTO: number;
  return (data: T, releaser: ReleaseExecutionFunction): void => {
    if(emitterTO) {
      window.clearTimeout(emitterTO);
    }
    emitterTO = window.setTimeout(() => releaser(), time);
  };
}


// TODO: docs
// TODO: test
export function countReleaser<T=any> (max: number, start: number = 0): ReleaseFunction<any> {
  let count: number = start;
  return (data: T, releaser: ReleaseExecutionFunction): void => {
    if(++count >= max) {
      count = start;
      releaser();
    }
  };
}


// TODO: docs
// TODO: test
export function lengthReleaser<T=any> (max: number): ReleaseFunction<any> {
  return (data: T[], releaser: ReleaseExecutionFunction): void => {
    if(data.length === max) {
      releaser();
    }
  };
}
