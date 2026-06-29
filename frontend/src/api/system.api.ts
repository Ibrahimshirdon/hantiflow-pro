import { apiClient, type ApiSuccess } from "./client";

export async function resetSystem(confirm: string) {
  const { data } = await apiClient.post<ApiSuccess<{ deletedAuthUsers: number }>>(
    "/system/reset",
    { confirm },
  );
  return data.data;
}
