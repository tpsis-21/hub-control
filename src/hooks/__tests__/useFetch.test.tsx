import { renderHook, act } from "@testing-library/react";
import { useFetch } from "../useFetch";
test("useFetch retorna dados", async () => {
  const fetcher = () => Promise.resolve("ok");
  const { result } = renderHook(() => useFetch(fetcher));
  await act(async () => { await result.current.execute(); });
  expect(result.current.data).toBe("ok");
});