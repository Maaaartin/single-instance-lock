import net from 'net';
import fs from 'fs';
import { EventEmitter } from 'events';

export enum LockType {
    First,
    Last
}

/**
 * Manages single instance lock
 */
export class SingleInstanceLock extends EventEmitter {
    private server?: net.Server;
    private readonly socketPath: string;
    private client?: net.Socket;
    constructor(name: string) {
        super();
        this.socketPath = `\\\\.\\pipe\\${name}-sock`;
    }

    private deleteSocket(): void {
        try {
            fs.unlinkSync(this.socketPath);
        } catch (e) {
            if (e.code !== 'ENOENT') {
                throw e;
            }
        }
    }

    private serve(): void {
        this.server = net.createServer((connection) => {
            connection.on('data', (data) => {
                const dataStr = data.toString();
                if (dataStr === 'stop') {
                    this.server?.close();
                    this.emit('error', new Error('Instance already running'));
                }
            });
        });
        this.server?.on('connection', (socket) => {
            socket.write('lock');
        });
        this.server?.listen(this.socketPath, () => {
            this.emit('locked');
        });
        this.server?.on('error', (e: any) => {
            if (e.code == 'EADDRINUSE') {
                this.client?.end(() => {
                    const clientSocket = new net.Socket();
                    clientSocket.on('error', (e: any) => {
                        if (e.code == 'ECONNREFUSED') {
                            this.deleteSocket();
                            this.server?.listen(this.socketPath, () => {
                                this.emit('locked');
                            });
                        }
                    });
                    clientSocket.connect({ path: this.socketPath });
                });
            }
        });
    }

    /**
     * Emitted when lock is created
     */
    public on(event: 'locked', listener: () => void): this;

    /**
     * Emitted whenever error occures
     */
    public on(event: 'error', listener: (error: Error) => void): this;

    public on(event: string, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }

    /**
     * Creates single instance lock
     * @param type Locktype - first only first instance can run; last - only last instance can run
     */
    public lock(type: LockType): void {
        if (type === LockType.Last) {
            this.client = net.connect({ path: this.socketPath }, () => {
                this.client?.on('data', (data) => {
                    if (data.toString() === 'lock') {
                        this.client?.write('stop');
                        this.client?.emit('close');
                    }
                });
            });

            this.client.on('close', () => {
                this.serve();
            });
            // crashes, if not error handler registred
            this.client.on('error', () => null);
        }
        if (type === LockType.First) {
            this.client = net.connect({ path: this.socketPath }, () => {
                this.client?.write('connectionAttempt', () => {
                    this.client?.end(() => {
                        this.emit('error', new Error('Instance already running'));
                    });
                });
            });

            this.client.on('error', () => {
                this.deleteSocket();
                this.serve();
            });
        }
    }

    /**
     * Unlocks single instance lock
     * @param cb Callback function
     */
    public unlock(cb?: () => void): void {
        this.server?.close();
        this.client?.end(cb);
        this.deleteSocket();
    }
}