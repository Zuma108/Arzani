// Basic test to ensure Jest is properly configured
describe('Initial Setup', () => {
  it('should pass this simple test', () => {
    expect(true).toBe(true);
  });
  
  it('should handle basic math operations', () => {
    expect(1 + 1).toBe(2);
    expect(5 * 5).toBe(25);
  });
});
