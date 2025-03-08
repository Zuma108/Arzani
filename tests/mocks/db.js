// Mock database client for testing
const pool = {
  connect: jest.fn().mockImplementation(() => {
    return {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn()
    };
  }),
  query: jest.fn().mockResolvedValue({ rows: [] })
};

export default pool;
