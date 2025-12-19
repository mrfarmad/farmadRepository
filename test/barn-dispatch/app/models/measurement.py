from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    Float,
    DateTime,
    ForeignKey,
    String,
    Index,
)
from app.core.db import Base


class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, index=True)

    controller_id = Column(
        Integer,
        ForeignKey("controllers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    co2 = Column(Float, nullable=True)
    ammonia = Column(Float, nullable=True)

    extra = Column(String(255), nullable=True)

    ts = Column(
        DateTime,
        default=datetime.utcnow,
        index=True,
        nullable=False,
    )


Index(
    "ix_measurements_ctrl_ts",
    Measurement.controller_id,
    Measurement.ts,
)
