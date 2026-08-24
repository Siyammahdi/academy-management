import { parseRedisConnection } from './redis.connection';

describe('parseRedisConnection', () => {
  it('parses a plain redis URL', () => {
    expect(parseRedisConnection('redis://localhost:6379')).toEqual({
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    });
  });

  it('parses credentials and enables TLS for rediss://', () => {
    expect(
      parseRedisConnection('rediss://default:s3cret%40pass@redis.example:6380'),
    ).toEqual({
      host: 'redis.example',
      port: 6380,
      username: 'default',
      password: 's3cret@pass',
      tls: {},
      maxRetriesPerRequest: null,
    });
  });
});
