"""Pausa una llamada por cuota y reintenta esa misma entrega con Ollama."""
import asyncio
import os
import httpx

from . import workspace_store as store
from .providers.ollama import OllamaProvider
from .provider_activity import instrument

PENDING = {}


def local_provider():
    return instrument(OllamaProvider(
        os.getenv('CAUCE_LOCAL_MODEL', 'llama3.1:8b'),
        host=os.getenv('OLLAMA_HOST', 'http://127.0.0.1:11434'), timeout=600,
    ), 'contexto')


class QuotaFallback:
    def __init__(self, provider, workspace_id, value):
        self.provider = provider
        self.workspace_id = workspace_id
        self.value = value
        self.lock = asyncio.Lock()

    def __getattr__(self, key):
        return getattr(self.provider, key)

    async def json(self, *args, **kwargs):
        # Serializar evita que otros especialistas sigan enviando mientras se decide.
        async with self.lock:
            try:
                return await self.provider.json(*args, **kwargs)
            except httpx.HTTPStatusError as exc:
                if self.provider.name != 'gemini' or exc.response.status_code != 429:
                    raise
                decision = asyncio.get_running_loop().create_future()
                key = (self.workspace_id, self.value['id'])
                PENDING[key] = decision
                self.value.update(status='waiting_provider', provider_issue={
                    'code': 429, 'message': 'La API de Gemini ha llegado a su límite de uso.',
                    'local_model': os.getenv('CAUCE_LOCAL_MODEL', 'llama3.1:8b'),
                })
                store.save_job(self.workspace_id, self.value)
                try:
                    self.provider = await decision
                finally:
                    PENDING.pop(key, None)
                self.value.update(status='running', provider_issue=None, continued_with={
                    'provider': self.provider.name, 'model': self.provider.model,
                })
                store.save_job(self.workspace_id, self.value)
                return await self.provider.json(*args, **kwargs)
