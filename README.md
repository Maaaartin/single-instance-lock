# Single Instance Lock

Single Instance Lock is a module enabling Node.js script running as single instance apps.

## Installation

Use following command.

```bash
yarn install single-instance-lock
```

## Usage
Creating simple locker
```ts
import { SingleInstanceLock, LockType } from 'single-instance-lock';

const locker = new SingleInstanceLock('some-id');

// creates a single instance lock
locker.lock(LockType.Last);

locker.on('locked', () => {
    // running as single instance
    // your code goes here
});

locker.on('error', (err) => {
    // app with this id is already running
});

locker.unlock(() => {
    // lock was removed        
});
```
Lock Types
```ts

    // ...
    // Keeps lock on the last executed instance and closes the previously executed ones
    locker.lock(LockType.Last);
    // ...

    // ...
    // Keeps lock on the first executed instance and closes the later executed ones
    locker.lock(LockType.First);
    // ...
```

## License
[MIT](https://choosealicense.com/licenses/mit/)