import random

from fastapi import APIRouter, Header
from pydantic import BaseModel

router = APIRouter()


class BalanceResponse(BaseModel):
    address: str
    chain: str
    balance: str
    symbol: str


class Transaction(BaseModel):
    hash: str
    from_address: str
    to_address: str
    value: str
    status: str
    block_number: int


class NFT(BaseModel):
    contract: str
    token_id: str
    name: str
    image_url: str | None


@router.get("/balance/{address}", response_model=BalanceResponse)
async def get_balance(
    address: str,
    chain: str = "ethereum",
    x_organization_id: str = Header(...),
):
    """Get wallet balance"""
    # Mock balance - would call actual blockchain RPC in production
    mock_balance = round(random.uniform(0.1, 100), 4)  # noqa: S311

    return {
        "address": address,
        "chain": chain,
        "balance": str(mock_balance),
        "symbol": "ETH" if chain == "ethereum" else "MATIC",
    }


@router.get("/tx/{tx_hash}", response_model=Transaction)
async def get_transaction(
    tx_hash: str,
    x_organization_id: str = Header(...),
):
    """Get transaction details"""
    # Mock transaction
    return {
        "hash": tx_hash,
        "from_address": "0x" + "a" * 40,
        "to_address": "0x" + "b" * 40,
        "value": "1.5",
        "status": "confirmed",
        "block_number": 18500000 + random.randint(0, 10000),  # noqa: S311
    }


@router.get("/nfts/{address}")
async def get_nfts(
    address: str,
    x_organization_id: str = Header(...),
    limit: int = 50,
):
    """Get NFTs for a wallet"""
    # Mock NFTs
    mock_nfts = [
        {
            "contract": "0x" + "c" * 40,
            "token_id": str(i),
            "name": f"NFT #{i}",
            "image_url": f"https://placeholder.com/nft/{i}",
        }
        for i in range(min(limit, 10))
    ]

    return {"nfts": mock_nfts, "total": len(mock_nfts)}


@router.get("/contracts/{address}")
async def get_contract_info(
    address: str,
    x_organization_id: str = Header(...),
):
    """Get smart contract information"""
    return {
        "address": address,
        "name": "Mock Contract",
        "type": "ERC20",
        "verified": True,
    }
