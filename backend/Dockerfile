FROM python:3.12-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install --no-install-recommends -y git libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# El backend ejecuta YOLO en CPU. Instalar primero estas ruedas evita que
# ultralytics arrastre la distribución de PyTorch con dependencias CUDA.
RUN pip install --no-cache-dir \
    torch==2.14.1+cpu torchvision==0.29.1+cpu \
    --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt \
    && python -c "import torch; assert torch.version.cuda is None, 'PyTorch instaló CUDA inesperadamente'"

COPY app ./app

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
